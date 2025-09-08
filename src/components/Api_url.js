// export const URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContentexportVITE_API_KEY=AIzaSyDqIGpHpXgXaNMZnXWfZhKo-RwZTMMWWEg";

export const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_API_KEY}`;


console.log("API KEY from env 👉", import.meta.env.VITE_API_KEY);



// "VITE_API_KEY=AIzaSyDqIGpHpXgXaNMZnXWfZhKo-RwZTMMWWEg;"