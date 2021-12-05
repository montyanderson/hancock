import assertEquals from "@/lib/assertEquals";

const toString = (arr: Uint8Array) =>
	[...arr].map((c) => String.fromCharCode(c)).join("");

interface TokenStream {
	index: () => Promise<number>;
	skip: (arg0: number) => Promise<void>;
	bytes: (arg0: number) => Promise<Uint8Array>;
	string: (arg0: number) => Promise<string>;
	uint8: () => Promise<number>;
	uint16: () => Promise<number>;
	uint24: () => Promise<number>;
	uint32: () => Promise<number>;
	uint32BE: () => Promise<number>;
}

export default (
	read: (arg0: number, arg1: number) => Promise<Uint8Array>
): TokenStream => {
	const minChunkSize = 128 * 1024;

	let index = 0;
	let buffer: Uint8Array = new Uint8Array(0);

	const ensureAtLeast = async (capacity: number) => {
		while (buffer.length < index + capacity) {
			const chunkSize = Math.max(capacity, minChunkSize);
			const chunk = await read(chunkSize, buffer.length);

			assertEquals(chunk.length, chunkSize);

			buffer = new Uint8Array([...buffer, ...chunk]);
		}
	};

	return {
		index: async () => index,

		skip: async (bytes) => {
			await ensureAtLeast(bytes);

			index += bytes;
		},

		bytes: async (bytes) => {
			await ensureAtLeast(bytes);

			const arr = buffer.slice(index, index + bytes);
			index += bytes;

			return arr;
		},

		string: async (chars) => {
			await ensureAtLeast(chars);

			const str = toString(buffer.slice(index, index + chars));
			index += chars;

			return str;
		},

		uint8: async () => {
			await ensureAtLeast(1);

			return buffer[index++];
		},

		uint16: async () => {
			await ensureAtLeast(2);

			const a = buffer[index++];
			const b = buffer[index++];

			return (a << 8) + b;
		},

		uint24: async () => {
			await ensureAtLeast(3);

			const a = buffer[index++];
			const b = buffer[index++];
			const c = buffer[index++];

			return (a << 16) + (b << 8) + c;
		},

		// flipped endianness
		uint32: async () => {
			await ensureAtLeast(4);

			const a = buffer[index++];
			const b = buffer[index++];
			const c = buffer[index++];
			const d = buffer[index++];

			return (d << 24) + (c << 16) + (b << 8) + a;
		},

		uint32BE: async () => {
			await ensureAtLeast(4);

			const a = buffer[index++];
			const b = buffer[index++];
			const c = buffer[index++];
			const d = buffer[index++];

			return (a << 24) + (b << 16) + (c << 8) + d;
		}
	};
};
