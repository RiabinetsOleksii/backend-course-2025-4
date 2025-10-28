const http = require('http');
const fs = require('fs');
const url = require('url');
const { program } = require('commander');
const { XMLBuilder } = require('fast-xml-parser');

program
    .requiredOption('-i, --input <path>', 'path to input JSON file')
    .requiredOption('-h, --host <host>', 'server host')
    .requiredOption('-p, --port <port>', 'server port');

program.parse(process.argv);
const options = program.opts();

const inputPath = options.input;
const host = options.host;
const port = Number(options.port);

if (!fs.existsSync(inputPath)) {
    console.error('Cannot find input file');
    process.exit(1);
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    fs.readFile(inputPath, 'utf8', (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Internal server error');
            return;
        }

        try {
            const jsonData = JSON.parse(data);

            const includeVariety = String(query.variety || '').toLowerCase() === 'true';
            const minPetal = query.min_petal_length ? Number(query.min_petal_length) : null;

            const filtered = jsonData.filter(item => {
                if (typeof item["petal.length"] !== 'number') return false;
                if (minPetal !== null && !isNaN(minPetal)) {
                    return item["petal.length"] > minPetal;
                }
                return true;
            });

            const root = { irises: { flower: [] } };
            filtered.forEach(item => {
                const flower = {
                    petal_length: item["petal.length"],
                    petal_width: item["petal.width"]
                };
                if (includeVariety) {
                    flower.variety = item.variety;
                }
                root.irises.flower.push(flower);
            });

            const builder = new XMLBuilder({
                ignoreAttributes: false,
                format: true,
                indentBy: "  ",
                suppressEmptyNode: true
            });

            const xmlContent = builder.build(root);

            res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
            res.end(xmlContent);
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Invalid JSON format');
        }
    });
});

server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});
