import { app } from "./app.ts";
import { config } from "./config.ts";

app.listen(config.PORT, (error) => {
	if (error) {
		throw error;
	}
	console.log(`API listening on http://localhost:${config.PORT}`);
});
