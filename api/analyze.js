export const config = {
    runtime: 'edge', // Executa mais rápido na Vercel
};

const SYSTEM_PROMPT = `
🎯 Papel da IA:
Você é uma IA especialista em avaliação, precificação e análise de risco de produtos de logística reversa, com foco exclusivo em: Eletrônicos Portáteis, Informática, Eletrônicos Domésticos e Eletrodomésticos Pequenos.

🔒 ESCOPO FIXO (NÃO SAIR DISSO):
Analise APENAS: Celulares, Tablets, Smartwatches, Fones, Notebooks, Desktops, Monitores, Componentes, TVs, Projetores, Som, Cafeteiras, Airfryers, Micro-ondas, Aspiradores, Ventiladores, Ferros.

❌ PROIBIDO:
Veículos, Máquinas industriais, Ferramentas pesadas, Móveis, Imóveis, Eletrodomésticos grandes (geladeira, fogão).

⚠️ REGRA DE REJEIÇÃO:
Se o produto estiver fora do escopo, defina o campo JSON "isInScope" como false e "outOfScopeReason" como "Produto fora do escopo de análise.". NÃO estime preço.

📊 Critérios de Análise:
1. Identifique o item e categoria.
2. Estado físico (Novo, Usado, Defeito, Sucata).
3. Valor de Mercado (Estimativa conservadora).
4. Risco da Categoria (1=Baixo a 10=Alto).
5. Preço Máximo para Leilão (Lance recomendado).
6. Potencial de Revenda (Venda direta, Reparo, Peças).

Sua resposta DEVE ser um objeto JSON válido seguindo estritamente o schema solicitado.
`;

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { image } = await req.json();

        if (!image) {
            return new Response(JSON.stringify({ error: 'Image data missing' }), { status: 400 });
        }

        // Recupera a chave do ambiente (Variável de ambiente da Vercel)
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
        }

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        // Prepara a imagem (remove o header data:image/...)
        const [header, base64Data] = image.split(',');
        const mimeType = header.match(/data:(.*?);/)[1];

        const payload = {
            contents: [{ role: "user", parts: [{ text: "Analise este item. Responda APENAS com o JSON." }, { inlineData: { mimeType: mimeType, data: base64Data } }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "isInScope": { "type": "BOOLEAN" },
                        "outOfScopeReason": { "type": "STRING" },
                        "itemName": { "type": "STRING" },
                        "description": { "type": "STRING" },
                        "condition": { "type": "STRING" },
                        "estimatedPriceR$:": { "type": "NUMBER" },
                        "maxBidRecommendationR$": { "type": "NUMBER" },
                        "itemCategory": { "type": "STRING" },
                        "categoryRiskScore": { "type": "NUMBER" },
                        "resalePotential": { "type": "STRING" }
                    },
                    required: ["isInScope", "itemName", "description", "condition", "estimatedPriceR$:", "itemCategory", "categoryRiskScore", "maxBidRecommendationR$", "resalePotential"]
                }
            },
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error: ${errText}`);
        }

        const result = await response.json();
        const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!jsonText) throw new Error("No text generated");

        return new Response(jsonText, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}
