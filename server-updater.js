const { createClient } = require('@supabase/supabase-js');
const query = require('samp-query');

// Конфигурация Supabase
const SUPABASE_URL = 'https://ipauzjhvvylydjkkpmvg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwYXV6amh2dnlseWRqa2twbXZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwNjgwNzksImV4cCI6MjA2NTY0NDA3OX0.QDglFvYmbgK_dtTjy5-mG3NKJLB6FvSbTcBW90cITQE';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateAllServers() {
  try {
    // 1. Получаем все серверы из Supabase
    const { data: servers, error } = await supabase
      .from('hosted_servers')
      .select('id, ip, port');
    
    if (error) throw error;
    if (!servers || servers.length === 0) return;

    // 2. Обновляем статус каждого сервера
    for (const server of servers) {
      try {
        const response = await new Promise((resolve) => {
          query({
            host: server.ip,
            port: server.port,
            timeout: 5000
          }, (error, response) => {
            resolve(error ? null : response);
          });
        });

        // 3. Обновляем данные в Supabase
        if (response) {
          await supabase
            .from('hosted_servers')
            .update({
              current_players: response.online,
              max_players: response.maxplayers,
              server_status: response.online > 0 ? 'online' : 'offline',
              last_updated: new Date().toISOString(),
              ping: Math.floor(Math.random() * 100) + 1 // Пример пинга
            })
            .eq('id', server.id);
        } else {
          await supabase
            .from('hosted_servers')
            .update({
              server_status: 'offline',
              last_updated: new Date().toISOString()
            })
            .eq('id', server.id);
        }
        
        console.log(`Обновлен сервер ${server.id}`);
      } catch (serverError) {
        console.error(`Ошибка сервера ${server.id}:`, serverError.message);
      }
    }
  } catch (mainError) {
    console.error('Основная ошибка:', mainError.message);
  }
}

// Запускаем обновление каждые 30 секунд
setInterval(updateAllServers, 30000);
updateAllServers(); // Первый запуск
