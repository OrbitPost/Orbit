'use strict';

function discordId(value) {
  if (typeof value !== 'string' || !/^\d{15,22}$/.test(value)) throw new Error('Use a Discord ID copied from the app.');
  return value;
}

async function discordObservations({ guildId, inviterId, token, clock = Date.now, fetcher = fetch }) {
  const guild = discordId(guildId);
  const inviter = discordId(inviterId);
  const root = 'https://discord.com/api/v10/guilds/' + guild;
  const checkedAt = new Date(clock()).toISOString();
  const url = 'https://discord.com/channels/' + guild;
  async function read(suffix) {
    const response = await fetcher(root + suffix, {
      headers: { Authorization: 'Bot ' + token }, signal: AbortSignal.timeout(20000), redirect: 'error'
    });
    if (!response.ok) throw new Error('Discord returned HTTP ' + response.status + '.');
    return response.json();
  }
  const [members, invites] = await Promise.allSettled([read('?with_counts=true'), read('/invites')]);
  const rows = [];
  if (members.status === 'fulfilled' && Number.isInteger(members.value?.approximate_member_count)
      && members.value.approximate_member_count >= 0) {
    rows.push({ key: 'discord.' + guild + '.members.approximate', platform: 'discord',
      label: 'Discord members (approximate)', coverage: 'Discord API member estimate', checkedAt, url,
      value: members.value.approximate_member_count });
  }
  if (invites.status === 'fulfilled' && Array.isArray(invites.value)) {
    const list = invites.value;
    const canReadUses = list.length === 0 || list.some(item => Number.isInteger(item?.uses));
    const matching = list.filter(item => item?.inviter?.id === inviter);
    const countable = matching.every(item => Number.isInteger(item.uses) && item.uses >= 0);
    if (canReadUses && countable) {
      const value = matching.reduce((total, item) => {
        const expires = item.expires_at ? Date.parse(item.expires_at) : item.max_age > 0
          ? Date.parse(item.created_at) + item.max_age * 1000 : Infinity;
        return expires > clock() ? total + item.uses : total;
      }, 0);
      rows.push({ key: 'discord.' + guild + '.' + inviter + '.invite.uses', platform: 'discord',
        label: 'Your invite uses', coverage: 'Active invites for the configured inviter', checkedAt, url, value });
    }
  }
  if (!rows.length) throw new Error('Discord could not verify members or invite uses. Check the bot permissions and IDs.');
  return rows;
}

module.exports = { discordId, discordObservations };
