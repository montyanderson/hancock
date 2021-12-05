import {
	S3Client,
	GetObjectCommand,
	ListObjectsCommand
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { S3Path } from "@/types";
import assertEquals from "@/lib/assertEquals";
import createTokenStream from "@/lib/createTokenStream";

export interface Track {
	path: S3Path;
	tags: { [key: string]: string };
	cover: string | null;
}

enum BlockType {
	VorbisComment = 4,
	Picture = 6
}

const readableStreamToUint8Array = async (
	stream: ReadableStream
): Promise<Uint8Array> => {
	const reader = stream.getReader();
	let buffer = new Uint8Array(0);

	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;

		buffer = new Uint8Array([...buffer, ...value]);
	}

	return buffer;
};

export const getTrack = async (s3: S3Client, path: S3Path): Promise<Track> => {
	const read = async (
		length: number,
		position: number
	): Promise<Uint8Array> => {
		const { Body } = await s3.send(
			new GetObjectCommand({
				...path,
				Range: `bytes=${position}-${position + length - 1}`
			})
		);

		return readableStreamToUint8Array(Body as unknown as ReadableStream);
	};

	const tokens = createTokenStream(read);

	const format = await tokens.string(4);
	assertEquals(format, "fLaC");

	const tags: { [key: string]: string } = {};
	let cover = null;

	const parseBlock = async (): Promise<{
		blockType: number;
		isLastBlock: boolean;
	}> => {
		const _blockType = await tokens.uint8();
		const mask = 1 << 7;

		const isLastBlock = !!(_blockType & mask);
		const blockType: BlockType = _blockType & ~mask;

		console.log(path.Key, {
			blockType,
			isLastBlock
		});

		const blockLength = await tokens.uint24();
		const indexAtBlock = await tokens.index();

		switch (blockType) {
			default:
				await tokens.skip(blockLength);
				break;

			case BlockType.VorbisComment:
				const vendorLength = await tokens.uint32();
				const vendor = await tokens.string(vendorLength);

				const commentsListLength = await tokens.uint32();

				for (let i = 0; i < commentsListLength; i++) {
					const commentLength = await tokens.uint32();
					const comment = await tokens.string(commentLength);

					const [key, value] = comment.split("=");
					tags[key.toLowerCase()] = value;
				}
				break;

			case BlockType.Picture:
				const pictureType = await tokens.uint32BE();

				const mimeTypeLength = await tokens.uint32BE();
				const mimeType = await tokens.string(mimeTypeLength);

				const descriptionLength = await tokens.uint32BE();
				const description = await tokens.string(descriptionLength);

				const width = await tokens.uint32BE();
				const height = await tokens.uint32BE();
				const colorDepth = await tokens.uint32BE();
				const indexColors = await tokens.uint32BE();
				const length = await tokens.uint32BE();

				const data = new Uint8Array([...(await tokens.bytes(length))]);

				const base64Url = await new Promise((resolve) => {
					const reader = new FileReader();

					reader.onloadend = () => resolve(reader.result);
					reader.readAsDataURL(new Blob([data.buffer]));
				});

				if (typeof base64Url !== "string") {
					throw new Error("base64Url not string");
				}

				cover = `data:${mimeType};base64,${base64Url.split(",", 2)[1]}`;
				break;
		}

		assertEquals(indexAtBlock + blockLength, await tokens.index());

		return {
			blockType,
			isLastBlock
		};
	};

	while ((await parseBlock()).isLastBlock === false);

	const url = await getSignedUrl(
		s3,
		new GetObjectCommand({
			...path
		})
	);

	return {
		path,
		tags,
		cover
	};
};
