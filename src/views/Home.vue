<style>
.container {
	display: flex;
}

.tracks {
	font-size: 1rem;
	text-align: left;

	width: 50%;
}

.tracks tbody {
	display: flex;
	flex-direction: column;
	gap: 7px;

	height: 100%;
	max-height: 95vh;

	overflow-y: scroll;
}

.tracks tbody::-webkit-scrollbar {
	display: none;
}

.tracks tr {
	display: flex;
	align-items: center;
	border-radius: 3px;
}

.tracks tr:hover {
	background: #111;
}

.cover {
	width: 42px;
	height: 42px;

	margin-right: 10px;
}

.title {
	width: 40%;
}

.artist {
	width: 20%;
}

.album {
	width: 20%;
}

.menu {
	margin-left: auto;
	margin-right: 20px;
}
</style>

<template>
	<div class="container">
		<table class="tracks">
			<tbody>
				<tr v-for="track in tracks" v-on:dblclick="play(track)">
					<td>
						<img
							class="cover"
							v-if="track.cover"
							v-bind:src="track.cover"
						/>

						<div class="cover" v-else></div>
					</td>

					<td class="title">{{ track.tags.title }}</td>

					<td class="artist">{{ track.tags.artist }}</td>
					<td class="album">{{ track.tags.album }}</td>

					<td class="menu">...</td>
				</tr>
			</tbody>
		</table>

		<currently-playing></currently-playing>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { useRoute } from "vue-router";

import { useStore } from "@/store";
import { Track } from "@/lib/getTrack";
import CurrentlyPlaying from "@/components/CurrentlyPlaying.vue";

export default defineComponent({
	name: "Home",
	setup: () => {
		const route = useRoute();

		const { accessKeyId, secretAccessKey, Bucket } = route.params;

		const store = useStore();

		store.dispatch("index", {
			accessKeyId,
			secretAccessKey,
			Bucket
		});

		const tracks = computed<Track[]>(() => store.getters.sortedTracks);
		const play = (track: Track) => {
			store.dispatch("play", track);
		};

		return {
			tracks,
			play
		};
	},
	components: {
		CurrentlyPlaying
	}
});
</script>
