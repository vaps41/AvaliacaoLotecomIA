export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    // Retorna as configurações armazenadas nas variáveis de ambiente
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };

    return new Response(JSON.stringify({
        firebaseConfig,
        appId: 'leilao-v1' // Nome do seu app
    }), {
        headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store' // Importante para não cachear credenciais
        }
    });
}