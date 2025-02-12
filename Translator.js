const axios = require('axios');

class Translator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api-free.deepl.com/v2/translate';
  }

  async translate(text) {
    try {
      const response = await axios.post(this.apiUrl, null, {
        params: {
          auth_key: this.apiKey,
          text: text,
          target_lang: 'FR',
        },
      });

      if (response.data && response.data.translations && response.data.translations.length > 0) {
        return response.data.translations[0].text;
      } else {
        throw new Error('Translation failed');
      }
    } catch (error) {
      console.error('Error during translation:', error);
      throw error;
    }
  }
}

module.exports = Translator;
