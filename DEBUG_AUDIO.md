# 🔊 TESTE DE ÁUDIO - Guia de Debug

## 🚨 IMPORTANTE: Recarregue a Extensão Primeiro!

Antes de testar, você DEVE recarregar a extensão:

1. Vá para: `chrome://extensions/`
2. Encontre **Study AI**
3. Clique no botão **🔄 Reload** (ícone circular)
4. Aguarde 2 segundos

---

## 🧪 Teste 1: Verificar Console Logs

### Passo 1: Abrir Console do Background
1. Em `chrome://extensions/`
2. Localize **Study AI**
3. Clique em **"Service Worker"** (link azul)
4. Abrirá DevTools do background.js

### Passo 2: Abrir Console do Offscreen
1. Com DevTools do background aberto
2. Clique na aba **"Console"**
3. Você deve ver: `[Offscreen] Documento carregado`
4. Se NÃO ver, há problema ao criar offscreen!

---

## 🧪 Teste 2: Testar Som Manualmente

### Passos:
1. Abra o popup da extensão (clique no ícone)
2. Vá para **Configurações**
3. Clique no botão **🔊 Testar**

### O Que Deve Aparecer no Console:

**Console do Background (Service Worker):**
```
[BG] Teste de som solicitado: sparkle vol: 70
[BG] Offscreen document criado (ou já existe)
[BG] Mensagem de teste enviada com sucesso
```

**Console do Offscreen:**
```
[Offscreen] Mensagem recebida: {action: 'testSound', soundType: 'sparkle', volume: 70}
[Offscreen] Teste de som: sparkle (volume: 70%)
[Offscreen] playNotificationSound chamada: sparkle, 70%
[Offscreen] AudioContext criado: running
[Offscreen] Volume calculado: 0.7
[Offscreen] generateAndPlaySound executado
[Offscreen] Som tocado com sucesso
```

### Se NÃO aparece nada:
❌ **Problema:** Mensagem não chegou ao offscreen
**Solução:** Recarregue a extensão completamente

### Se aparece "AudioContext criado: suspended":
❌ **Problema:** Chrome bloqueou áudio (política autoplay)
**Solução:** Clique em qualquer lugar da página primeiro (interação do usuário necessária)

---

## 🧪 Teste 3: Timer Automático

### Passos:
1. Abra o popup
2. Vá para **Foco** (aba 1)
3. Clique **Iniciar**
4. Aguarde o timer chegar a 00:00 (ou use DevTools para forçar)

### Console Esperado:

**Background:**
```
[BG] Enviando som timer: sparkle vol: 70
[BG] Mensagem de som enviada com sucesso
```

**Offscreen:**
```
[Offscreen] Timer finalizado: sparkle (volume: 70%)
[Offscreen] Som tocado com sucesso
```

---

## 🐛 Problemas Comuns

### Problema 1: Offscreen não carrega
**Sintomas:** Não aparece `[Offscreen] Documento carregado`

**Soluções:**
1. Verifique se `offscreen.html` existe
2. Verifique se `manifest.json` tem `"offscreen"` em permissions
3. Recarregue extensão

### Problema 2: AudioContext suspended
**Sintomas:** `AudioContext criado: suspended`

**Causa:** Chrome bloqueia áudio até interação do usuário

**Soluções:**
1. Clique no botão "Testar Som" (isso conta como interação)
2. OU mude a política de autoplay:
   - `chrome://settings/content/sound`
   - Adicione exceção para extensões

### Problema 3: Mensagem não chega
**Sintomas:** Console do background mostra envio, mas offscreen não recebe

**Soluções:**
1. Recarregue a extensão
2. Verifique se há múltiplos service workers rodando
3. Force criação de novo offscreen:
   ```javascript
   // No console do background:
   chrome.offscreen.closeDocument();
   // Tente tocar som novamente
   ```

### Problema 4: Som não toca mesmo com logs OK
**Sintomas:** Todos os logs aparecem mas não ouve nada

**Verificar:**
1. Volume do sistema não está mudo?
2. Volume da extensão está acima de 0?
3. Fones de ouvido conectados corretamente?
4. Teste com outro navegador/dispositivo

---

## 🔬 Debug Avançado

### Forçar Criação de Som no Console

**Console do Background:**
```javascript
// Testar diretamente
chrome.runtime.sendMessage({
  action: 'testSound',
  soundType: 'sparkle',
  volume: 100
});
```

**Console do Offscreen (para acessar, veja instruções abaixo):**
```javascript
// Testar síntese direta
const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);
gain.gain.value = 0.5;
osc.frequency.value = 440; // Lá 440Hz
osc.start();
setTimeout(() => osc.stop(), 500);
```

### Como Acessar Console do Offscreen

O offscreen não tem console próprio, mas os logs aparecem no console do **Service Worker**.

1. `chrome://extensions/`
2. Study AI → **"Service Worker"**
3. Console mostrará logs do background.js E offscreen.js

---

## ✅ Checklist de Diagnóstico

Execute na ordem:

- [ ] 1. Recarreguei a extensão?
- [ ] 2. Console do background está aberto?
- [ ] 3. Vejo `[Offscreen] Documento carregado`?
- [ ] 4. Cliquei em "🔊 Testar"?
- [ ] 5. Vejo logs `[BG] Teste de som solicitado`?
- [ ] 6. Vejo logs `[Offscreen] Mensagem recebida`?
- [ ] 7. Vejo `AudioContext criado: running` (não suspended)?
- [ ] 8. Volume do sistema está ligado?
- [ ] 9. Volume da extensão > 0?
- [ ] 10. Testei com fones de ouvido?

Se TODOS checados e ainda não funciona:

→ Cole os logs completos do console aqui para análise!

---

## 📊 Status Atual do Código

### O que foi corrigido:
✅ `background.js` agora usa `await` no sendMessage
✅ Logs de debug adicionados em todas as etapas
✅ Tratamento de erro melhorado
✅ Console mostra exatamente onde falha

### O que você deve fazer:
1. **RECARREGAR EXTENSÃO** (crucial!)
2. Seguir os testes acima
3. Copiar os logs do console
4. Reportar o que aparece

---

**Última atualização:** Janeiro 2026 - Debug Logs Implementados
