# Migrations

As migrations do TypeORM são geradas aqui depois que você escolher o banco.

Passos:

1. Preencha as variáveis `DB_*` no `.env` (copie de `.env.example`) com o banco
   escolhido — só `DB_TYPE` e as credenciais mudam.
2. Instale o driver do banco. Exemplos:
   - PostgreSQL: `npm install pg`
   - MySQL/MariaDB: `npm install mysql2`
   - SQLite: `npm install sqlite3`
   - SQL Server: `npm install mssql`
3. Gere a migration inicial a partir das entidades:
   ```
   npm run migration:generate -- src/infrastructure/database/migrations/Init
   ```
4. Aplique:
   ```
   npm run migration:run
   ```

Enquanto não há banco, o serviço compila normalmente (`npm run build`); a
conexão só é exigida em tempo de execução (`npm run start`).
