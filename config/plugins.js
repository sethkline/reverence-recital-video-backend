module.exports = ({ env }) => ({
  email: {
    provider: 'sendgrid',
    providerOptions: {
      apiKey: env('SENDGRID_API_KEY')
    },
    settings: {
      defaultFrom: 'kirsten@reverencestudios.com',
      defaultReplyTo: 'kirsten@reverencestudios.com',
      testAddress: 'kirsten@reverencestudios.com'
    }
  }
});
