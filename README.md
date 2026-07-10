# Gateway de Notificações

Microsserviço em Node.js + TypeScript para centralizar o envio assíncrono de notificações por e-mail, SMS e push, usando PostgreSQL para persistência e RabbitMQ para mensageria.

O projeto recebe requisições via API REST, salva a notificação com status `PENDING`, publica o `notificationId` na fila principal e processa a entrega em background com retry e DLQ.

## Visão geral

O fluxo funciona assim:

1. A API recebe `POST /api/v1/notifications`.
2. O payload é validado com `zod`.
3. A notificação é salva no banco com status `PENDING`.
4. O `notificationId` é publicado no RabbitMQ.
5. O consumer processa a mensagem em background.
6. O status é atualizado para `SENT` ou `FAILED`.

Se o envio falhar, a mensagem volta para a fila com backoff de 1 minuto, 5 minutos e 15 minutos. Depois da terceira falha, ela é movida para a DLQ.

## Stack

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- RabbitMQ
- Docker e docker-compose
- Zod
- Pino

## Funcionalidades

- API REST para criação de notificações
- Persistência em PostgreSQL
- Publicação assíncrona em RabbitMQ
- Consumer separado da API
- Retry com filas de 1m, 5m e 15m
- Dead Letter Queue para falhas finais
- Provedores fake para simular falhas de entrega
- Logs estruturados com `pino`

## Requisitos

- Node.js 20+
- npm
- Docker e Docker Compose

## Variáveis de ambiente

Copie o arquivo de exemplo e configure as variáveis de ambiente:

```env
 cp .env.example .env
```

## Como rodar com Docker

Suba a infraestrutura e a aplicação com:

```bash
docker compose up --build
```

Isso inicia:

- PostgreSQL
- RabbitMQ com interface de gerenciamento
- migração do banco
- API
- Worker

### Acessos locais

- API: `http://localhost:3000`
- Health check: `GET /health`
- RabbitMQ Management: `http://localhost:15672`

## Como rodar localmente sem Docker

1. Instale as dependências.

```bash
npm install
```

2. Aplique o schema no banco.

```bash
npm run prisma:push
```

3. Compile o projeto.

```bash
npm run build
```

4. Rode a API.

```bash
npm run dev:api
```

5. Em outro terminal, rode o worker.

```bash
npm run dev:worker
```

## Scripts disponíveis

- `npm run build`: compila o TypeScript
- `npm run prisma:push`: aplica o schema no banco
- `npm run dev:api`: sobe a API em modo watch
- `npm run dev:worker`: sobe o worker em modo watch
- `npm run start:api`: executa a API compilada
- `npm run start:worker`: executa o worker compilado

## API

### `GET /health`

Retorna o status básico da aplicação.

#### Resposta

```json
{
	"status": "ok"
}
```

### `POST /api/v1/notifications`

Cria uma notificação, salva no banco e publica o job no RabbitMQ.

#### Corpo da requisição

```json
{
	"recipient": "usuario@exemplo.com",
	"type": "EMAIL",
	"content": "Sua confirmação foi aprovada"
}
```

#### Resposta de sucesso

```json
{
	"message": "Notification accepted",
	"notification": {
		"id": "uuid",
		"recipient": "usuario@exemplo.com",
		"type": "EMAIL",
		"status": "PENDING",
		"payload": {
			"recipient": "usuario@exemplo.com",
			"type": "EMAIL",
			"content": "Sua confirmação foi aprovada"
		},
		"created_at": "2026-07-10T12:00:00.000Z",
		"updated_at": "2026-07-10T12:00:00.000Z"
	}
}
```

#### Respostas de erro

- `400`: payload inválido
- `500`: erro inesperado no servidor

## Modelo de dados

A tabela `notifications` armazena:

- `id`
- `recipient`
- `type`
- `status`
- `payload`
- `created_at`
- `updated_at`

## Fluxo de retry e DLQ

O worker consome a fila principal e tenta processar a mensagem.

Se falhar:

- 1ª falha: vai para a fila de retry de 1 minuto
- 2ª falha: vai para a fila de retry de 5 minutos
- 3ª falha: vai para a fila de retry de 15 minutos
- falha final: vai para a DLQ e a notificação fica como `FAILED`

Esse comportamento evita que a fila principal fique travada por mensagens problemáticas.

## Observações

- O projeto usa provedores fake para simular sucesso e falha de entrega.
- O worker está separado da API para manter o processamento assíncrono.
- A DLQ é destinada à análise manual posterior.

## Licença

Projeto pessoal para estudo e portfólio.
