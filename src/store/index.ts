import { InjectionKey } from "vue";
import { createStore, useStore as baseUseStore, Store } from "vuex";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
	S3Client,
	GetObjectCommand,
	ListObjectsCommand
} from "@aws-sdk/client-s3";

import { S3Path } from "@/types";
import { getTrack, Track } from "@/lib/getTrack";

export interface State {
	client: S3Client | null;
	tracks: Track[];
	playing: Track | null;
}

export const key: InjectionKey<Store<State>> = Symbol();

export const store = createStore<State>({
	state: {
		client: null,
		tracks: [],
		playing: null
	},
	getters: {
		trackUrl: (state) => async (track: Track) => {
			if (state.client === null) {
				return "";
			}

			return getSignedUrl(
				state.client,
				new GetObjectCommand({
					...track.path
				})
			);
		},

		sortedTracks: (state) => {
			const tracks: Track[] = [...state.tracks];

			return tracks.sort((a: Track, b: Track) => {
				console.log(a.tags);

				if (a.tags.artist > b.tags.artist) return 1;
				if (a.tags.artist < b.tags.artist) return -1;

				if (a.tags.album > b.tags.album) return 1;
				if (a.tags.album < b.tags.album) return -1;

				if (Number(a.tags.tracknumber) > Number(b.tags.tracknumber))
					return 1;
				if (Number(a.tags.tracknumber) < Number(b.tags.tracknumber))
					return -1;

				return 0;
			});
		}
	},
	mutations: {
		setClient: (state, client: S3Client) => {
			state.client = client;
		},
		pushTrack: (state, track: Track) => {
			state.tracks.push(track);
		},
		setPlaying: (state, track: Track) => {
			state.playing = track;
		}
	},
	actions: {
		index: async (
			{ commit },
			{
				accessKeyId,
				secretAccessKey,
				Bucket
			}: {
				accessKeyId: string;
				secretAccessKey: string;
				Bucket: string;
			}
		) => {
			const s3 = new S3Client({
				endpoint: "https://gateway.eu1.storjshare.io",
				region: "us-east-1",
				credentials: {
					accessKeyId,
					secretAccessKey
				}
			});

			commit("setClient", s3);

			async function* traverse(
				extension: string,
				path: string = ""
			): AsyncIterable<S3Path> {
				const response = await s3.send(
					new ListObjectsCommand({
						Bucket
					})
				);

				if (typeof response.Contents !== "undefined") {
					for (const { Key } of response.Contents) {
						if (
							typeof Key === "string" &&
							Key.endsWith(extension)
						) {
							yield { Key, Bucket };
						}
					}
				}
			}

			const queue: S3Path[] = [];

			// push onto queue
			(async () => {
				for await (const path of traverse(".flac")) {
					queue.push(path);
				}
			})();

			// pull from queue
			(async () => {
				const createThread = async () => {
					const wait = (ms: number) =>
						new Promise((resolve) => setTimeout(resolve, ms));

					while (queue.length === 0) {
						await wait(10);
					}

					while (queue.length) {
						const path = queue.shift();

						if (typeof path === "undefined") {
							return;
						}

						const track = await getTrack(s3, path);
						commit("pushTrack", track);
					}
				};

				const threads = 4;

				for (let i = 0; i < threads; i++) {
					createThread();
				}
			})();
		},

		play: ({ commit }, track: Track) => {
			commit("setPlaying", track);
		}
	},
	modules: {}
});

export function useStore() {
	return baseUseStore(key);
}
