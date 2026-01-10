# 🔊 Guia de Teste de Áudio - Sistema Completo

## ✅ O Que Foi Implementado

### 1. Sistema Híbrido de Áudio
- **Primário:** Arquivos MP3 reais em `assets/`
- **Fallback:** Síntese via Web Audio API

### 2. Arquitetura
```
popup.js → background.js → offscreen.js → <audio> ou Web Audio API
```

### 3. Arquivos Criados
- ✅ `assets/sparkle.mp3`
- ✅ `assets/piano.mp3`
- ✅ `assets/chime.mp3`
- ✅ `assets/bell.mp3`
- ✅ `assets/README.md` (instruções)
- ✅ `generate_sounds.py` (gerador de sons)

---

## 🚀 Teste Rápido (3 Passos)

### Passo 1: Recarregar Extensão
```
chrome://extensions/ → Study AI → 🔄 Reload
```

### Passo 2: Abrir Console
```
chrome://extensions/ → Study AI → "Service Worker" → Console
```

### Passo 3: Testar Som
```
1. Abra o popup da extensão
2. Vá em "Configurações"
3. Clique no botão "🔊 Testar"
```

---

## 📋 O Que Deve Acontecer

### Cenário A: MP3s Prontos (Ideal)
```
Console:
[Offscreen] Mensagem recebida: {action: 'testSound', ...}
[Offscreen] Tentando tocar arquivo: chrome-extension://...sparkle.mp3
[Offscreen] Áudio carregado, iniciando playback
[Offscreen] Áudio tocando via elemento <audio>
```
✅ **Som toca via arquivo MP3**

### Cenário B: MP3s Inválidos (Fallback)
```
Console:
[Offscreen] Falha ao tocar MP3, usando fallback de síntese
[Offscreen] Usando síntese de áudio para: sparkle
[Offscreen] AudioContext criado: running
[Offscreen] Som sintetizado com sucesso
```
✅ **Som toca via síntese (Web Audio API)**

### Cenário C: AudioContext Suspended
```
Console:
[Offscreen] AudioContext criado: suspended
[Offscreen] AudioContext resumed
```
⚠️ **Chrome bloqueou áudio - precisa interação do usuário**

**Solução:** Clique no botão "Testar" novamente (isso conta como interação)

---

## 🎵 Como Gerar Sons Reais

### Opção 1: Script Python (Recomendado)

1. **Instale dependências:**
   ```bash
   pip install numpy scipy
   ```

2. **Execute o gerador:**
   ```bash
   python generate_sounds.py
   ```

3. **Converta WAV → MP3:**
   ```bash
   # Instale ffmpeg se não tiver: https://ffmpeg.org/download.html
   ffmpeg -i assets/sparkle.wav -codec:a libmp3lame -qscale:a 2 assets/sparkle.mp3
   ffmpeg -i assets/piano.wav -codec:a libmp3lame -qscale:a 2 assets/piano.mp3
   ffmpeg -i assets/chime.wav -codec:a libmp3lame -qscale:a 2 assets/chime.mp3
   ffmpeg -i assets/bell.wav -codec:a libmp3lame -qscale:a 2 assets/bell.mp3
   ```

### Opção 2: Baixar Sons Gratuitos

**Sites confiáveis:**
- [Freesound.org](https://freesound.org) - Licença CC0
- [Zapsplat.com](https://zapsplat.com) - Free tier
- [Mixkit.co](https://mixkit.co/free-sound-effects/) - Royalty-free

**Busque por:**
- "notification sound"
- "chime"
- "bell"
- "sparkle"

**Especificações:**
- Duração: 0.5s a 2s
- Formato: MP3
- Tamanho: Máximo 100KB

### Opção 3: Gravar Seus Próprios Sons

Use [Audacity](https://www.audacityteam.org/) (gratuito):
1. Gerar → Tom
2. Escolha frequência (440Hz = Lá)
3. Exportar → MP3
4. Salve em `assets/`

---

## 🐛 Troubleshooting

### ❌ Problema 1: "Failed to load resource: net::ERR_FILE_NOT_FOUND"
**Causa:** Arquivos MP3 não existem ou estão corrompidos

**Solução:**
1. Verifique se os arquivos estão em `assets/`
2. Use `generate_sounds.py` para criar novos
3. O fallback de síntese deve funcionar automaticamente

### ❌ Problema 2: "AudioContext suspended"
**Causa:** Chrome bloqueou autoplay de áudio

**Solução:**
1. Clique no botão "Testar" (interação do usuário)
2. O código já chama `audioContext.resume()` automaticamente

### ❌ Problema 3: Nenhum log aparece
**Causa:** Offscreen document não foi criado

**Solução:**
1. Verifique `manifest.json` tem `"offscreen"` em permissions
2. Verifique se `offscreen.html` existe
3. Recarregue a extensão completamente

### ❌ Problema 4: Som toca mas está mudo
**Causa:** Volume do sistema ou da extensão está em 0

**Solução:**
1. Verifique volume do Windows/Chrome
2. No popup → Configurações → Ajuste o slider de volume
3. Tente aumentar para 100% e teste novamente

---

## 🔍 Debug Avançado

### Ver Todos os Arquivos Carregados
No console do background:
```javascript
chrome.runtime.getManifest().web_accessible_resources
```

### Testar Carregamento de Arquivo Direto
No console do offscreen:
```javascript
const audio = new Audio(chrome.runtime.getURL('assets/sparkle.mp3'));
audio.volume = 0.5;
audio.play().then(() => console.log('✅ Tocou')).catch(e => console.error('❌', e));
```

### Forçar Síntese (Ignorar MP3)
Edite `offscreen.js` linha 42, mude:
```javascript
await audio.play();
```
Para:
```javascript
throw new Error('Forçar fallback para teste');
```

---

## 📊 Fluxo Completo

```mermaid
graph TD
    A[Usuário clica "Testar"] --> B[popup.js envia mensagem]
    B --> C[background.js: ensureOffscreenDocument]
    C --> D{Offscreen existe?}
    D -->|Não| E[Criar offscreen]
    D -->|Sim| F[Enviar mensagem para offscreen]
    E --> F
    F --> G[offscreen.js recebe mensagem]
    G --> H[Tentar tocar MP3]
    H --> I{MP3 válido?}
    I -->|Sim| J[new Audio + play]
    I -->|Não| K[Fallback: Web Audio API]
    J --> L[🔊 Som toca]
    K --> L
```

---

## ✅ Checklist de Funcionamento

Execute na ordem:

- [ ] 1. Extensão recarregada (`chrome://extensions/`)
- [ ] 2. Console do Service Worker aberto
- [ ] 3. Popup aberto
- [ ] 4. Aba "Configurações" ativa
- [ ] 5. Volume do slider > 0
- [ ] 6. Cliquei em "🔊 Testar"
- [ ] 7. Vejo logs no console
- [ ] 8. Ouço algum som (MP3 ou síntese)

Se **todos** marcados e **não ouviu som:**
→ Problema no hardware/sistema operacional (volume mudo, fones desconectados)

---

## 🎯 Status Final

### Implementações Completas:
✅ Offscreen document criado corretamente  
✅ Sistema híbrido MP3 + fallback  
✅ Logs detalhados em cada etapa  
✅ Tratamento de erros robusto  
✅ Suporte a interação do usuário (resume AudioContext)  
✅ Volume configurável (0-100%)  
✅ 4 tipos de sons diferentes  

### Próximos Passos (Opcional):
- [ ] Adicionar mais sons (ex: alarme urgente, relógio tique-taque)
- [ ] Permitir upload de sons personalizados
- [ ] Adicionar visualizador de forma de onda
- [ ] Implementar fade in/out nos sons

---

**Última atualização:** Janeiro 2026 - Sistema de Áudio v2.0
