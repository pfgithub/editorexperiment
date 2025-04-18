import html from "./index.html";

// Start the server
const server = Bun.serve({
    routes: {
        "/": html,
    },
    port: 3005, // You can change the port if needed
});

console.log(`Server is running at ${server.url}`);

console.log(Bun.which("start"), Bun.which("cmd"));