const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || process.argv[2] || 8080);
const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
};

http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.normalize(path.join(root, requested));

    if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404);
            res.end("Not found");
            return;
        }

        res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
        res.end(data);
    });
}).listen(port, "127.0.0.1", () => {
    console.log(`http://127.0.0.1:${port}/index.html`);
});
