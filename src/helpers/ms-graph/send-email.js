/**
 *
 * @param {any} msGraph
 * @param {string} sender
 * @param {{subject: string, body: string}} content
 * @param {[string]} recipients
 * @returns {Promise<*>}
 */
async function sendEmail(msGraph, sender, { subject, body }, recipients) {
  const toRecipients = recipients.map((emailAddress) => {
    return {
      emailAddress: {
        address: emailAddress
      }
    }
  })

  return await msGraph.api(`users/${sender}/sendMail`).post({
    message: {
      subject,
      body: {
        contentType: 'html',
        content: body
      },
      toRecipients
    },
    saveToSentItems: 'false'
  })
}

export { sendEmail }
