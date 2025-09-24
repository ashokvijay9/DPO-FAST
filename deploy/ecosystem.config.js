// Configuração PM2 para produção
module.exports = {
  apps: [{
    name: 'dpo-fast-api',
    script: 'server/index.js',
    instances: 2, // Usar 2 instâncias para balanceamento
    exec_mode: 'cluster',
    
    // Variáveis de ambiente
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Adicione outras variáveis de produção aqui
    },
    
    // Logs
    error_file: '/opt/dpo-fast/logs/error.log',
    out_file: '/opt/dpo-fast/logs/out.log',
    log_file: '/opt/dpo-fast/logs/combined.log',
    time: true,
    
    // Configurações de restart
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 1000,
    
    // Monitoramento
    max_memory_restart: '1G',
    
    // Configurações avançadas
    watch: false, // Não usar watch em produção
    ignore_watch: ['node_modules', 'uploads', 'logs'],
    
    // Configurações de graceful reload
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Auto restart se houver crash
    autorestart: true,
    
    // Configurações de cluster
    instance_var: 'INSTANCE_ID',
    
    // Merge logs de todas as instâncias
    merge_logs: true,
    
    // Configurações de processo
    node_args: '--max-old-space-size=1024'
  }]
}