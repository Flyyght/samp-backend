const express = require("express");
const query = require("samp-query");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// Настройки Supabase
const SUPABASE_URL = 'https://ipauzjhvvylydjkkpmvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYXV6amh2dnlseWRqa2twbXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjgwNzksImV4cCI6MjA2NTY0NDA3OX0.QDglFvYmbgK_dtTjy5-mG3NKJLB6FvSbTcBW90cITQE'; // укорочено для примера
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let servers = []; // Будет обновляться из Supabase
let cache = {};

// Загрузка списка серверов из Supabase
async function refreshServersList() {
  try {
    const { data, error } = await supabase
      .from("hosted_servers")
      .select("ip, port");

    if (error) {
      console.error("Ошибка загрузки серверов:", error.message);
      return;
    }

    if (Array.isArray(data)) {
      servers = data;
      console.log("Список серверов обновлён:", servers);
    }
  } catch (err) {
    console.error("Ошибка получения серверов:", err.message);
  }
}

// Обновление информации по каждому серверу
function updateCache() {
  servers.forEach((server) => {
    query(
      {
        host: server.ip,
        port: server.port,
        timeout: 2000,
      },
      (error, response) => {
        const key = `${server.ip}:${server.port}`;
        if (!error && response) {
          cache[key] = {
            online: response["online"],
            max: response["maxplayers"],
            hostname: response["hostname"],
            gamemode: response["gamemode"],
            updated: new Date().toISOString(),
            ping: Math.floor(Math.random() * 80) + 20 // заглушка
          };
        } else {
          cache[key] = {
            error: "Unavailable",
            updated: new Date().toISOString(),
          };
        }
      }
    );
  });
}

// Первичная загрузка
refreshServersList().then(updateCache);

// Периодическое обновление
setInterval(refreshServersList, 60000); // список серверов — каждую минуту
setInterval(updateCache, 15000);        // опрос серверов — каждые 15 сек

// Папка с HTML и ресурсами
app.use(express.static(path.join(__dirname, "public")));

// Роут на корень
app.get("/", (req, res) => {
  res.send("SA-MP Server Query API is running.");
});

// monitor.html
app.get("/monitor", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "monitor.html"));
});

// API: получение текущего онлайна и пинга
app.get("/api/online", (req, res) => {
  const { ip, port } = req.query;
  if (!ip || !port) return res.status(400).json({ error: "Missing IP or port" });

  const data = cache[`${ip}:${port}`];
  if (data) res.json(data);
  else res.status(404).json({ error: "No data for this server yet" });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
