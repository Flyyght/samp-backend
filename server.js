const express = require("express");
const query = require("samp-query");
const app = express();
const PORT = process.env.PORT || 3000;

// Пример серверов, позже можно подключать Supabase
const servers = [
  { ip: "51.89.1.222", port: 7777 },
  { ip: "135.125.204.112", port: 7777 }
];

let cache = {};

// Запрашиваем сервера раз в 15 секунд
function updateCache() {
  servers.forEach((server) => {
    query(
      {
        host: server.ip,
        port: server.port,
        timeout: 2000
      },
      (error, response) => {
        const key = `${server.ip}:${server.port}`;
        if (!error && response) {
          cache[key] = {
            online: response["online"],
            max: response["maxplayers"],
            hostname: response["hostname"],
            gamemode: response["gamemode"],
            updated: new Date().toISOString()
          };
        } else {
          cache[key] = { error: "Unavailable", updated: new Date().toISOString() };
        }
      }
    );
  });
}
updateCache();
setInterval(updateCache, 15000);

app.get("/", (req, res) => {
  res.send("SA-MP Server Query API is running.");
});

app.get("/api/online", (req, res) => {
  const { ip, port } = req.query;
  if (!ip || !port) return res.status(400).json({ error: "Missing IP or port" });

  const data = cache[`${ip}:${port}`];
  if (data) res.json(data);
  else res.status(404).json({ error: "No data for this server yet" });
});

app.listen(PORT, () => console.log("Server running on port " + PORT));
