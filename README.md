# RemoveMarca – Remoção de Marca d'Água com IA

## Sobre o Projeto
Site estático que permite ao usuário fazer upload de uma imagem com marca d'água e removê-la automaticamente usando Inteligência Artificial (API fal.ai).

---

## ✅ Funcionalidades Implementadas

- **Upload por clique ou drag & drop** – aceita PNG, JPG e WEBP até 10 MB
- **Remoção de marca d'água via IA** – integração com `fal-ai/image-editing/text-removal`
- **Barra de progresso animada** durante o processamento
- **Comparador antes/depois** com slider interativo (mouse e touch)
- **Download da imagem processada** diretamente pelo botão
- **Nova imagem** – reset completo do fluxo sem recarregar a página
- **Mensagens de erro amigáveis** para formatos inválidos, tamanho excessivo e falhas de API
- **Layout totalmente responsivo** (mobile, tablet e desktop)
- **Header fixo** com scroll suave para âncoras

---

## 📁 Estrutura de Arquivos

```
index.html        → Página principal
css/
  style.css       → Estilos globais (dark theme, animações, responsividade)
js/
  app.js          → Lógica de upload, integração com API, compare slider
README.md
```

---

## 🔌 API Utilizada

| Endpoint | Método | Descrição |
|---|---|---|
| `https://fal.run/fal-ai/image-editing/text-removal` | POST | Remove textos e marcas d'água de imagens |

**Payload enviado:**
```json
{
  "image_url": "data:image/png;base64,..."
}
```

**Resposta esperada:**
```json
{
  "image": { "url": "https://cdn.fal.ai/..." }
}
```

---

## 🚀 Como usar localmente

1. Clone o repositório
2. Abra `index.html` no navegador (ou sirva com um servidor local)
3. Faça upload de uma imagem com marca d'água
4. Clique em **Remover marca d'água**
5. Aguarde o processamento (até ~30 segundos)
6. Compare antes/depois com o slider e baixe o resultado

---

## ⚠️ Limitações / Pontos de melhoria

- A API `fal.run` pode exigir autenticação em ambientes de produção → considerar proxy CORS ou chave de API no servidor
- Resultados dependem da qualidade/tipo de marca d'água (textos translúcidos funcionam melhor)
- Não há histórico de imagens processadas (stateless)

---

## 🔮 Próximos passos sugeridos

- [ ] Adicionar opção de selecionar a região da marca d'água manualmente (bounding box)
- [ ] Salvar histórico de processamentos via Table API
- [ ] Suporte a múltiplas imagens em lote
- [ ] Modo claro/escuro
- [ ] Indicar confiança/qualidade da remoção

---

## 🛠️ Tecnologias

- HTML5 semântico
- CSS3 com variáveis customizadas e animações
- JavaScript ES2020 (async/await, FileReader, Fetch API)
- Font Awesome 6 (ícones)
- Google Fonts – Inter
- fal.ai Image Editing API (remoção de texto/marca d'água)
