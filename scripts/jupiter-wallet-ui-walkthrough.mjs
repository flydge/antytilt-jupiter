// Run only through the documented cua_repl Tab API, on a fresh native runtime.
// The agent's recorded acceptance used these same visible controls in real Chrome.
const button = (tab, name) => tab.playwright.getByRole('button', { name, exact: true })
const panel = (tab) => tab.playwright.locator('.jupiter-ticket-panel')
const read = (tab) => panel(tab).innerText()
async function nativeBoundary(tab) {
  const url = new URL(await tab.url())
  if (url.origin !== 'http://127.0.0.1:15973' || !(await read(tab)).includes('NATIVE REHEARSAL'))
    throw new Error('Native rehearsal UI required; never run against an owner wallet')
}
export async function phase(tab, name) {
  await nativeBoundary(tab)
  if (name === 'connect') await button(tab, 'Connect Native rehearsal wallet').click()
  else if (name === 'setup-review') await button(tab, 'Review setup').click()
  else if (name === 'setup-send' || name === 'revoke-send') {
    await tab.playwright.getByRole('checkbox', { name: 'I reviewed the network, owner, recipient and exact costs.', exact: true }).check()
    await button(tab, name === 'setup-send' ? 'Sign & send setup' : 'Sign & send nonce revocation').click()
  } else if (name === 'action-confirmation') await button(tab, 'Check action confirmation').click()
  else if (name === 'prepare') {
    await tab.playwright.getByLabel('Minimum closing price · USD', { exact: true }).fill('150')
    await button(tab, 'Prepare reviewed ticket').click()
  } else if (name === 'arm') {
    await tab.playwright.getByRole('checkbox', { name: 'I reviewed the floor, costs, expiry and owner wSOL recipient. I will not manually close or reopen this dedicated position while ARMED or PENDING.', exact: true }).check()
    await button(tab, 'Sign close ticket without sending').click()
  } else if (name === 'disable') await button(tab, 'Disable locally').click()
  else if (name === 'revoke-review') await button(tab, 'Review nonce revocation').click()
  else if (name === 'confirm-revoke') await button(tab, 'Check nonce revocation').click()
  else if (name === 'trigger') {
    await tab.playwright.getByRole('checkbox', { name: 'I approve sending this exact reviewed close request once now.', exact: true }).check()
    await button(tab, 'Send close request once').click()
  } else if (name === 'reconcile') await button(tab, 'Reconcile finalized status').click()
  else throw new Error('Unknown walkthrough phase')
  return read(tab)
}
