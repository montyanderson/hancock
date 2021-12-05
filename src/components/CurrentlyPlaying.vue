<style scoped>
.player {
	width: 50%;

	display: flex;
	flex-direction: column;
	align-items: center;
}

.player-container {
	margin-top: 1rem;
	width: 60%;
	max-width: 500px;
	text-align: left;
}

.player-cover {
	background: grey;
	width: 100%;
	border-radius: 3px;
}

audio {
	width: 100%;
	max-width: 500px;
}

.title {
	font-weight: 600;
	font-size: 1.5rem;
}

.artist {
	font-weight: 400;
	font-size: 1rem;

	margin-top: -1rem;
	margin-bottom: 2rem;
}
</style>

<template>
	<div class="player" v-if="track !== null">
		<div class="player-container">
			<img class="player-cover" v-bind:src="track.cover" />

			<p class="title">{{ track.tags.title }}</p>
			<p class="artist">{{ track.tags.artist }}</p>
			<!--<p class="album">{{ track.tags.album }}</p>-->

			<audio controls v-bind:src="url" autoplay></audio>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from "vue";

import { useStore } from "@/store";

export default defineComponent({
	name: "Player",
	setup: () => {
		const store = useStore();

		const track = computed(() => store.state.playing);

		const url = ref<string>("");

		watch(track, async () => {
			url.value = await store.getters.trackUrl(track.value);
		});

		return {
			track,
			url
		};
	}
});
</script>
