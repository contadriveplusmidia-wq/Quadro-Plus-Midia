# Validação da Lógica: Código de Execução

## 📋 Resumo da Proposta

Cada demanda recebe automaticamente um **Código de Execução** no formato:
- **{DIA_DA_SEMANA}{ORDEM_NO_DIA}**
- Exemplo: `QA1` = primeira demanda da quarta-feira

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### 1. **CONFLITO DE CÓDIGOS: Segunda vs Sexta** ✅ RESOLVIDO

**Decisão:**
- Segunda-feira: `S` (mantém)
- Sexta-feira: `SX` (solução adotada)

**Resultado:**
- Sem conflito de códigos
- Identificação clara e única

---

### 2. **DOMINGO: O que fazer?** ✅ DECIDIDO

**Decisão:**
- Domingo normalmente não precisa registrar demandas
- **MAS** se alguém registrar, usar código `D`

**Implementação:**
- Permitir criação no domingo
- Gerar código `D1`, `D2`, etc. normalmente

---

### 3. **ESCOPO DA CONTAGEM: Global ou por Designer?**

**Questão crítica:**
- A ordem é contada **globalmente** (todas as demandas do dia)?
- Ou **por designer** (cada designer tem sua própria sequência)?

**Exemplo do problema:**

**Cenário 1: Contagem Global**
- 08:00 - Designer A cria demanda → `QA1`
- 08:30 - Designer B cria demanda → `QA2`
- 09:00 - Designer A cria outra → `QA3`

**Cenário 2: Contagem por Designer**
- 08:00 - Designer A cria demanda → `QA1`
- 08:30 - Designer B cria demanda → `QA1` (própria sequência)
- 09:00 - Designer A cria outra → `QA2`

**Recomendação:** 
- **Contagem GLOBAL** (mais simples e consistente)
- Facilita rastreamento geral do sistema
- Evita duplicação de códigos no mesmo dia

---

### 4. **CONCORRÊNCIA: Demandas Simultâneas**

**Problema:**
- Dois designers criam demandas ao mesmo tempo
- Ambos contam 5 demandas existentes
- Ambos recebem código `QA6`?

**Solução técnica:**
- Usar **transação com lock** no banco
- Contar dentro da transação antes de inserir
- Garantir atomicidade

---

### 5. **HORÁRIO DO DIA: 00:00 ou 06:00?**

**Questão:**
- O sistema já usa **6h da manhã** como início do dia útil
- O código deve seguir esse padrão?

**Exemplo:**
- Demanda criada às 05:30 → conta para o dia anterior?
- Demanda criada às 06:00 → conta para o dia atual?

**Recomendação:** 
- Usar **00:00:00 até 23:59:59** (dia calendário)
- Mais simples e intuitivo
- Ou seguir padrão de 6h se for regra de negócio

---

## ✅ MAPEAMENTO CORRIGIDO

| Dia da Semana | Código | Exemplo |
|---------------|--------|---------|
| Segunda-feira | `S` | S1, S2, S3... |
| Terça-feira | `T` | T1, T2, T3... |
| Quarta-feira | `QA` | QA1, QA2, QA3... |
| Quinta-feira | `QI` | QI1, QI2, QI3... |
| Sexta-feira | `SX` ✅ | SX1, SX2, SX3... |
| Sábado | `SB` | SB1, SB2, SB3... |
| Domingo | `D` ✅ | D1, D2, D3... (caso necessário) |

---

## 🔍 QUESTÕES PARA VALIDAR

### 1. **Unicidade do Código**
- O código precisa ser único no sistema?
- Ou pode repetir em dias diferentes? (ex: `S1` toda segunda)

**Resposta esperada:** Pode repetir (é por dia)

### 2. **Edição de Demandas**
- Se uma demanda for editada, o código muda?
- Ou o código é imutável após criação?

**Resposta esperada:** Código imutável

### 3. **Exclusão de Demandas**
- Se uma demanda for excluída, os códigos seguintes mudam?
- Ou mantém a sequência original?

**Resposta esperada:** Mantém sequência (não reordena)

### 4. **Visualização**
- O código aparece em todos os lugares ou apenas no histórico?
- Precisa ser destacado visualmente?

**Resposta esperada:** Apenas histórico e lista do dia

---

## 📝 LÓGICA TÉCNICA PROPOSTA

### Função de Geração

```typescript
async function generateExecutionCode(timestamp: number): Promise<string> {
  const date = new Date(timestamp);
  const dayOfWeek = date.getDay(); // 0=domingo, 1=segunda, ..., 6=sábado
  
  // Mapeamento final (confirmado)
  const dayCodes = {
    0: 'D',   // Domingo (caso necessário)
    1: 'S',   // Segunda
    2: 'T',   // Terça
    3: 'QA',  // Quarta
    4: 'QI',  // Quinta
    5: 'SX',  // Sexta (confirmado: SX)
    6: 'SB'   // Sábado
  };
  
  // Domingo: permitir mas usar código 'D'
  // (não precisa de tratamento especial)
  
  const dayCode = dayCodes[dayOfWeek];
  
  // Calcular início e fim do dia (00:00:00 até 23:59:59.999)
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  
  // Contar demandas do dia (GLOBAL - todas as demandas)
  const countResult = await pool.query(
    'SELECT COUNT(*) as count FROM demands WHERE timestamp >= $1 AND timestamp <= $2',
    [startTimestamp, endTimestamp]
  );
  
  const totalDemandsInDay = parseInt(countResult.rows[0]?.count || '0', 10) || 0;
  const orderInDay = totalDemandsInDay + 1;
  
  return `${dayCode}${orderInDay}`;
}
```

### Fluxo de Criação

1. **Validar dia da semana** (bloquear domingo se necessário)
2. **Iniciar transação** (BEGIN)
3. **Contar demandas do dia** (dentro da transação)
4. **Gerar código** = `${dayCode}${count + 1}`
5. **Inserir demanda** com código
6. **Commit transação**

---

## ✅ CHECKLIST ANTES DE IMPLEMENTAR

- [x] Confirmar: Sexta-feira usa `SX` ✅
- [x] Confirmar: Domingo usa código `D` (se necessário) ✅
- [ ] Confirmar: Contagem é GLOBAL ou por designer?
- [ ] Confirmar: Horário do dia é 00:00 ou 06:00?
- [ ] Confirmar: Código é imutável após criação?
- [ ] Confirmar: Exclusão mantém sequência original?
- [ ] Validar: Onde o código aparece visualmente?

---

## 🎯 DECISÕES CONFIRMADAS

1. **Sexta-feira → `SX`** ✅ (confirmado)
2. **Domingo → `D`** ✅ (se necessário, permitir)
3. **Contagem GLOBAL** (recomendado - mais simples)
4. **Horário 00:00-23:59** (recomendado - dia calendário)
5. **Código imutável** (recomendado - não muda após criação)
6. **Transação com lock** (necessário - evitar concorrência)

---

## 📌 PRÓXIMOS PASSOS

1. Validar todas as questões acima
2. Confirmar mapeamento final
3. Implementar função de geração
4. Adicionar coluna `execution_code` na tabela
5. Atualizar frontend para exibir código
6. Testar concorrência e edge cases

