# Regras de Negócio — Valentim

Este documento define as regras fundamentais do sistema.

---

## 1. Regra de isolamento por escritório

Todo dado operacional deve pertencer a um escritório.

Entidades com `officeId` obrigatório:

```txt
User
Client
Company
DocumentRequest
DocumentFile
Deadline
Alert
Message
Charge
Proposal
AuditLog
```

Regra:

> Nenhuma consulta pode retornar dados de outro escritório.

---

## 2. Regra de clientes

- Um cliente pode ser pessoa física ou jurídica.
- Um cliente pode ter uma ou mais empresas.
- Um cliente inativo não deve gerar novas pendências automaticamente.
- Excluir cliente deve ser evitado no MVP; preferir status `INACTIVE`.

---

## 3. Regra de empresas

- Toda empresa pertence a um cliente.
- Toda empresa pertence ao mesmo escritório do cliente.
- Uma empresa inativa não deve gerar novos documentos mensais.
- CNPJ deve ser único dentro do mesmo escritório.

---

## 4. Regra de documentos

Status possíveis:

```txt
PENDING
SENT
UNDER_REVIEW
APPROVED
REJECTED
OVERDUE
```

Fluxo normal:

```txt
PENDING → SENT → UNDER_REVIEW → APPROVED
```

Fluxo de recusa:

```txt
SENT → UNDER_REVIEW → REJECTED → SENT → APPROVED
```

Regras:

- Documento pendente pode receber upload.
- Ao receber upload, status muda para `SENT`.
- Funcionário pode marcar como `UNDER_REVIEW`.
- Funcionário pode aprovar.
- Funcionário pode recusar informando motivo.
- Documento recusado deve permitir novo envio.
- Documento com prazo vencido e sem envio pode aparecer como `OVERDUE`.

---

## 5. Regra de uploads

Tipos permitidos no MVP:

```txt
pdf
jpg
jpeg
png
xml
xlsx
csv
doc
docx
```

Tamanho máximo inicial:

```txt
20MB
```

Regras:

- Arquivo deve estar vinculado a uma solicitação de documento.
- Arquivo deve registrar quem enviou.
- Arquivo deve registrar nome original.
- Arquivo deve registrar tipo MIME.
- Arquivo deve registrar tamanho.
- Arquivo deve ser salvo em storage externo.
- Arquivo não deve ser salvo dentro do repositório.

---

## 6. Regra de prazos

Status possíveis:

```txt
OPEN
PAID
DONE
OVERDUE
CANCELED
```

Regras:

- Prazo com data vencida e status `OPEN` deve aparecer como atrasado.
- Prazo pode ser marcado como pago ou concluído.
- Prazo cancelado não aparece como pendência ativa.
- Prazo urgente deve aparecer destacado no dashboard.

---

## 7. Regra de alertas

Canais:

```txt
SYSTEM
EMAIL
WHATSAPP
```

No MVP:

- `SYSTEM` é obrigatório.
- `EMAIL` pode entrar após validação.
- `WHATSAPP` deve começar como mensagem pronta, não disparo automático obrigatório.

Status:

```txt
PENDING
SENT
READ
FAILED
CANCELED
```

Regras:

- Alerta deve estar vinculado a cliente, empresa ou evento.
- Alerta manual deve registrar usuário responsável.
- Alerta automático deve registrar origem do sistema.
- Histórico não deve ser apagado sem necessidade.

---

## 8. Regra do financeiro

Status possíveis:

```txt
OPEN
PAID
OVERDUE
CANCELED
```

Regras:

- Cobrança vencida e não paga deve aparecer como atrasada.
- Cobrança paga deve registrar data de pagamento.
- Valores devem usar Decimal.
- Não usar Float para dinheiro.
- O financeiro do MVP é controle interno, não gateway de pagamento.

---

## 9. Regra de propostas

Status possíveis:

```txt
DRAFT
SENT
ACCEPTED
REJECTED
EXPIRED
```

Regras:

- Proposta começa como rascunho.
- Ao enviar, vira `SENT`.
- Se aceita, vira `ACCEPTED`.
- Se recusada, vira `REJECTED`.
- Se passar da validade, pode aparecer como `EXPIRED`.
- Proposta aceita pode gerar cliente futuramente.

---

## 10. Regra de auditoria

Registrar logs para ações críticas:

```txt
login
criação de cliente
edição de cliente
upload de documento
aprovação de documento
recusa de documento
criação de prazo
marcação de cobrança como paga
envio de alerta
alteração de proposta
```

O log deve conter:

```txt
usuário
ação
entidade
id da entidade
metadata
data
```

---

## 11. Regra de dashboard

O dashboard deve sempre calcular informações a partir de dados reais.

Indicadores mínimos:

```txt
clientes ativos
empresas ativas
documentos pendentes
documentos enviados
documentos conferidos
prazos próximos
prazos atrasados
honorários em aberto
```

---

## 12. Regras fora do MVP

Não implementar no primeiro MVP:

- cálculo tributário automático;
- emissão de guias;
- integração direta com Receita Federal;
- conciliação bancária automática;
- WhatsApp em massa;
- assinatura digital;
- emissão de nota fiscal.

Esses itens ficam para fases futuras.
