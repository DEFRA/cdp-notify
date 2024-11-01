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
        contentType: 'Text',
        content: body
      },
      toRecipients
    },
    saveToSentItems: 'true'
  })
}

export { sendEmail }
