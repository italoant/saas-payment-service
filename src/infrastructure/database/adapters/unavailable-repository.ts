import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Provider usado quando o banco está desligado (DB_ENABLED=false).
 *
 * Mantém a injeção de dependências funcionando (a aplicação sobe), mas
 * qualquer chamada às operações de persistência responde 503, deixando claro
 * que o banco ainda não foi provisionado — em vez de derrubar o processo.
 */
function unavailable(): never {
  throw new ServiceUnavailableException(
    'Banco de dados não configurado (DB_ENABLED=false). ' +
      'Provisione o Postgres e defina as variáveis DB_* na Vercel.',
  );
}

/**
 * Nomes que o Nest e o runtime acessam para inspeção/ciclo de vida. Para esses
 * o proxy retorna undefined (nenhum hook), evitando que o erro seja disparado
 * durante a inicialização. O 503 só ocorre no uso real de uma rota de dados.
 */
const NON_METHOD_PROPS = new Set<string>([
  'then',
  'catch',
  'finally',
  'inspect',
  'toJSON',
  'toString',
  'onModuleInit',
  'onModuleDestroy',
  'onApplicationBootstrap',
  'onApplicationShutdown',
  'beforeApplicationShutdown',
]);

/**
 * Proxy que lança 503 apenas quando um método de repositório é chamado.
 *
 * Retorna undefined para acessos de inspeção e hooks de ciclo de vida do Nest,
 * para não disparar o erro durante a inicialização da aplicação.
 */
export function createUnavailableRepository<T>(): T {
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (typeof prop === 'symbol' || NON_METHOD_PROPS.has(prop)) {
          return undefined;
        }
        // Qualquer método de negócio chamado sinaliza indisponibilidade.
        return () => unavailable();
      },
    },
  ) as T;
}
