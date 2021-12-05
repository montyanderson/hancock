import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";
import Home from "../views/Home.vue";

const routes: Array<RouteRecordRaw> = [
	{
		path: "/:accessKeyId/:secretAccessKey/:Bucket",
		name: "Home",
		component: Home
	}
];

const router = createRouter({
	history: createWebHashHistory(),
	routes
});

export default router;
