export default (a: any, b: any) => {
	if (a !== b) {
		throw new Error(`'${a}' !== '${b}'`);
	}
};
