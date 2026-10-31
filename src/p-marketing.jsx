// Campaigns: promos to customers who said yes (Messenger if they opted in there, otherwise SMS), and Facebook page posts.
import { useStore, useNow, toast, getState, segmentMembers, segmentCount, personalize, createCampaign, sendCampaign, updateCampaign } from './store.js';
import { Icon, Btn, Badge, ChannelBadge, Modal, Seg, Field, Empty, Logo } from './ui.jsx';
import { useAdmin, PageHead, Stat, membersCount } from './admin-common.jsx';
import { peso, fmtWhen, firstName, cx, sum, num } from './util.js';

const { useState } = React;
const STATUS_TONE = { Sent: 'green', Posted: 'blue', Scheduled: 'violet', Draft: 'orange' };
export function CampaignStatus({ status }) { return <Badge tone={STATUS_TONE[status]}>{status}</Badge>; }

function audienceSize(s, audience) {
  if (audience === 'Loyalty members') return membersCount(s);
  if (audience === 'Everyone (public post)') return 1240;
  const g = s.segments.find((x) => x.name === audience);
  return g ? segmentCount(s, g) : 0;
}

function Preview({ s, channel, msg, audience }) {
  const sample = segmentMembers(s, audience).find((c) => c.consent === 'Yes') || (channel === 'Messenger' ? s.customers.find((c) => c.id === s.me) : null);
  const text = personalize(msg, sample) || 'Your message shows here.';
  return (
    <div className="card flat col" style={{ gap: 10 }}>
      <div className="row between"><span className="eyebrow">Preview</span><span className="tiny faint">{channel === 'Facebook page' ? 'Facebook page post' : channel === 'SMS' ? 'Text message (SMS), no buttons' : `As ${sample ? firstName(sample.name) : 'a customer'} sees it`}</span></div>
      <div className="mrow"><div className="av-slot"><Logo size={28} /></div><div className="mcol"><div className="bubble" style={{ background: 'var(--surface)' }}>{text}</div>{channel === 'Messenger' && <div className="mbtns"><button type="button" tabIndex={-1}>Order now</button></div>}</div></div>
    </div>
  );
}

export function Campaigns() {
  const s = useStore();
  const t = useNow(30000);
  const { open } = useAdmin();
  const sent = s.campaigns.filter((c) => c.status === 'Sent');
  const seen = sum(sent.filter((c) => c.channel !== 'SMS'), (c) => c.seen);
  const out = sum(sent, (c) => c.sent);
  const outSeen = sum(sent.filter((c) => c.channel !== 'SMS'), (c) => c.sent);
  return (
    <>
      <PageHead title="Campaigns" sub="Promos go only to customers who said yes: by Messenger if they opted in there, otherwise by SMS. Plus posts on the Bak Bak Facebook page.">
        <Btn kind="primary" icon="plus" onClick={() => open('newCampaign')}>New campaign</Btn>
      </PageHead>
      <div className="grid g4 keep2">
        <Stat label="Messages sent this month" value={num(out)} icon="send" />
        <Stat label="Seen (Messenger only)" value={outSeen ? Math.round((seen / outSeen) * 100) + '%' : '—'} icon="eye" tone="violet" />
        <Stat label="Offers redeemed" value={num(sum(sent, (c) => c.redeemed))} icon="ticket" tone="green" />
        <Stat label="Sales from campaigns" value={peso(sum(sent, (c) => c.sales))} icon="wallet" tone="orange" />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Campaign</th><th>Audience</th><th>Channel</th><th>Status</th><th className="r">Sent</th><th className="r">Seen</th><th className="r">Redeemed</th><th className="r">Sales</th></tr></thead>
            <tbody>
              {s.campaigns.map((c) => (
                <tr key={c.id} className="click" onClick={() => open('campaign', { id: c.id })}>
                  <td><div className="strong">{c.name}</div><div className="tiny faint">{c.src || (c.by ? `Made by ${c.by}` : '')}{c.status === 'Scheduled' ? ` · ${c.schedule}` : c.sentAt ? ` · ${fmtWhen(c.sentAt, t)}` : ''}</div></td>
                  <td className="small">{c.audience}</td>
                  <td><ChannelBadge channel={c.channel === 'Facebook page' ? 'Facebook' : c.channel} /></td>
                  <td><CampaignStatus status={c.status} /></td>
                  <td className="r num">{c.sent || '—'}</td>
                  <td className="r num">{c.seen || '—'}</td>
                  <td className="r num">{c.redeemed || '—'}</td>
                  <td className="r num">{c.sales ? peso(c.sales) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function CampaignDrawer({ id, onClose }) {
  const s = useStore();
  const t = useNow(30000);
  const c = s.campaigns.find((x) => x.id === id);
  const [msg, setMsg] = useState(c ? c.msg : '');
  if (!c) return <Modal side title="Campaign not found" onClose={onClose}><Empty icon="megaphone" title="This campaign doesn’t exist" /></Modal>;
  const editable = c.status === 'Draft' || c.status === 'Scheduled';
  const reach = audienceSize(s, c.audience);
  const meIn = segmentMembers(s, c.audience).some((x) => x.id === s.me);
  const send = () => {
    if (msg !== c.msg) updateCampaign(c.id, { msg });
    sendCampaign(c.id);
    const fresh = getState().campaigns.find((x) => x.id === c.id);
    toast(c.channel === 'Facebook page' ? 'Posted on the Facebook page' : `Sent to ${fresh.sent} customers${meIn ? '. Geanne’s phone got it too.' : ''}`);
  };
  return (
    <Modal side title={c.name} sub={`${c.audience} · ${c.channel}`} onClose={onClose} footer={editable ? <>
      {c.status === 'Draft' ? <Btn onClick={() => { updateCampaign(c.id, { msg, status: 'Scheduled', schedule: c.schedule || 'Tomorrow, 11:00 AM' }); toast(`Scheduled for ${c.schedule || 'Tomorrow, 11:00 AM'}`); }}>Schedule</Btn> : <Btn onClick={() => { updateCampaign(c.id, { status: 'Draft' }); toast('Moved back to draft'); }}>Back to draft</Btn>}
      {msg !== c.msg && <Btn onClick={() => { updateCampaign(c.id, { msg }); toast('Message saved'); }}>Save message</Btn>}
      <Btn kind="primary" icon="send" disabled={!msg.trim()} onClick={send}>{c.channel === 'Facebook page' ? 'Post now' : 'Send now'}</Btn>
    </> : <Btn onClick={onClose}>Close</Btn>}>
      <div className="row wrap"><CampaignStatus status={c.status} />{c.src && <Badge tone="violet" icon="sparkles">{c.src}</Badge>}{c.status === 'Scheduled' && <span className="small muted">{c.schedule}</span>}</div>
      {editable ? <Field label="Message" htmlFor="cd-msg" hint="{first name} becomes each customer’s first name."><textarea id="cd-msg" className="inp" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} /></Field> : null}
      <Preview s={s} channel={c.channel} msg={editable ? msg : c.msg} audience={c.audience} />
      <dl className="kv" style={{ gridTemplateColumns: '84px minmax(0,1fr)' }}>
        <dt>OFFER</dt><dd>{c.offer}</dd>
        <dt>AUDIENCE</dt><dd>{c.audience} · {num(reach)} {c.channel === 'Facebook page' ? 'followers' : 'customers'}</dd>
        {c.sentAt && <><dt>{c.status === 'Posted' ? 'POSTED' : 'SENT'}</dt><dd>{fmtWhen(c.sentAt, t)}</dd></>}
      </dl>
      {(c.status === 'Sent' || c.status === 'Posted') && (
        <div className="grid g2">
          <div className="card tight stat-tile"><span className="lbl">{c.status === 'Posted' ? 'Reached' : 'Sent'}</span><span className="val">{num(c.sent)}</span></div>
          <div className="card tight stat-tile"><span className="lbl">Seen</span><span className="val">{c.channel === 'SMS' ? '—' : num(c.seen)}</span></div>
          <div className="card tight stat-tile"><span className="lbl">Redeemed</span><span className="val">{num(c.redeemed)}</span></div>
          <div className="card tight stat-tile"><span className="lbl">Sales</span><span className="val">{peso(c.sales)}</span></div>
        </div>
      )}
      {c.delivered > 0 && <div className="info-line"><Icon name="message-circle" size={15} />Delivered to {c.delivered} sample chat{c.delivered > 1 ? 's' : ''} in this demo{meIn ? ', including Geanne’s phone' : ''}. Seen and redeemed counts fill in as customers open it.</div>}
      {c.channel !== 'Facebook page' && <div className="small faint">Only customers who said yes to promos get it.{c.channel === 'SMS' ? ' SMS has no “seen” count.' : ' Messenger promos need the customer’s opt-in to deals.'}</div>}
    </Modal>
  );
}

export function NewCampaignModal({ audience: a0, onClose }) {
  const s = useStore();
  const { open } = useAdmin();
  const audiences = [...s.segments.map((g) => g.name), 'Loyalty members'];
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('Messenger');
  const [audience, setAudience] = useState(a0 && audiences.includes(a0) ? a0 : 'Messenger regulars');
  const [msg, setMsg] = useState('Hi {first name}! ');
  const [offer, setOffer] = useState('');
  const [when, setWhen] = useState('now');
  const [schedule, setSchedule] = useState('Today, 6:00 PM');
  const [err, setErr] = useState('');
  const aud = channel === 'Facebook page' ? 'Everyone (public post)' : audience;
  const reach = audienceSize(s, aud);
  const meIn = segmentMembers(s, aud).some((x) => x.id === s.me);
  const create = () => {
    if (name.trim().length < 3) return setErr('Give the campaign a name.');
    if (msg.trim().length < 8) return setErr('Write the message.');
    const id = createCampaign({ name, audience: aud, channel, msg: msg.trim(), offer: offer.trim(), when, schedule });
    const c = getState().campaigns.find((x) => x.id === id);
    toast(when === 'now' ? (channel === 'Facebook page' ? 'Posted on the Facebook page' : `Sent to ${c.sent} customers${meIn ? '. Check Geanne’s phone.' : ''}`) : when === 'schedule' ? `Scheduled for ${schedule}` : 'Saved as a draft');
    onClose();
  };
  return (
    <Modal size="lg" title="New campaign" sub="Write once. Each customer gets their own first name." onClose={onClose} footer={<>
      <span className="grow small muted">{channel !== 'Facebook page' ? `${num(reach)} customers in ${aud}${meIn ? ' · includes Geanne' : ''}` : 'Public post on the Bak Bak page'}</span>
      <Btn onClick={onClose}>Cancel</Btn>
      <Btn kind="primary" icon={when === 'now' ? 'send' : null} onClick={create}>{when === 'now' ? (channel !== 'Facebook page' ? 'Send now' : 'Post now') : when === 'schedule' ? 'Schedule' : 'Save draft'}</Btn>
    </>}>
      <div className="grid g2">
        <div className="col gap-12">
          <Field label="Campaign name" htmlFor="nc-name"><input id="nc-name" className={cx('inp', err && !name.trim() && 'err')} value={name} onChange={(e) => { setName(e.target.value); setErr(''); }} placeholder="Rainy-day pick-up promo" /></Field>
          <Field label="Channel"><Seg options={['Messenger', 'SMS', 'Facebook page']} value={channel} onChange={setChannel} label="Channel" /></Field>
          {channel !== 'Facebook page' && <Field label="Audience" htmlFor="nc-aud"><select id="nc-aud" className="inp" value={audience} onChange={(e) => setAudience(e.target.value)}>{audiences.map((x) => <option key={x}>{x}</option>)}</select></Field>}
          <Field label="Message" htmlFor="nc-msg" hint="{first name} becomes each customer’s first name." error={err && name.trim() ? err : null}>
            <textarea id="nc-msg" className="inp" rows={4} value={msg} onChange={(e) => { setMsg(e.target.value); setErr(''); }} />
          </Field>
          <Field label="Offer (optional)" htmlFor="nc-offer"><input id="nc-offer" className="inp" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Free Fries upgrade" /></Field>
          <Field label="When"><Seg options={[{ value: 'now', label: 'Send now' }, { value: 'schedule', label: 'Schedule' }, { value: 'draft', label: 'Save draft' }]} value={when} onChange={setWhen} label="When" /></Field>
          {when === 'schedule' && <select className="inp" value={schedule} onChange={(e) => setSchedule(e.target.value)} aria-label="Schedule">{['Today, 6:00 PM', 'Tomorrow, 11:00 AM', 'Fri, Oct 23, 11:00 AM'].map((x) => <option key={x}>{x}</option>)}</select>}
          {err && !name.trim() && <div className="fld-e">{err}</div>}
        </div>
        <div className="col gap-12">
          <Preview s={s} channel={channel} msg={msg} audience={aud} />
          <div className="small faint">{channel === 'Messenger' ? 'Only customers who opted in to deals in Messenger get it. They can reply, and replies land in the Inbox.' : channel === 'SMS' ? 'Only customers who said yes to promos get it. Each text costs about ₱0.50 and has no “seen” count.' : 'Comments on the post land in the Inbox.'}</div>
        </div>
      </div>
    </Modal>
  );
}
