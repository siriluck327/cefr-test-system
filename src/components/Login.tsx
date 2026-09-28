import { useState, type FormEvent } from 'react';
import { CENTERS, shortCenter } from '../lib/centers';
import { cleanName, profileStore, useProfiles } from '../lib/profile';
import { logEvent } from '../lib/sync';

export function Login() {
  const { profiles } = useProfiles();
  const [name, setName] = useState('');
  const [center, setCenter] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (cleanName(name).length < 2) return setError('กรุณากรอกชื่อ-นามสกุล');
    if (!center) return setError('กรุณาเลือก ศกร.ระดับตำบล');
    profileStore.signIn(name, center);
    logEvent({ kind: 'login' });
  };

  return (
    <main className="page login">
      <section className="login-card">
        <span className="brand-mark big" aria-hidden="true">
          Aa
        </span>
        <h1>ฝึกอ่านภาษาอังกฤษ A1–C1</h1>
        <p className="muted">กรอกชื่อและเลือก ศกร. ของคุณ เพื่อบันทึกสถิติการฝึกเป็นรายบุคคล</p>

        <form onSubmit={submit} className="login-form" noValidate>
          <label>
            ชื่อ-นามสกุล
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="เช่น สมชาย ใจดี"
              maxLength={80}
              required
            />
          </label>
          <label>
            ศกร.ระดับตำบล
            <select
              value={center}
              onChange={(e) => {
                setCenter(e.target.value);
                setError('');
              }}
              required
            >
              <option value="">— เลือก ศกร. —</option>
              {CENTERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="small bad" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn primary wide">
            เริ่มใช้งาน
          </button>
        </form>

        {profiles.length > 0 && (
          <div className="device-users">
            <h2 className="small muted">ผู้ใช้ที่เคยเข้าบนเครื่องนี้</h2>
            <ul>
              {profiles.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="user-pick"
                    onClick={() => {
                      profileStore.switchTo(p.id);
                      logEvent({ kind: 'login' });
                    }}
                  >
                    <b>{p.name}</b>
                    <span className="small muted">{shortCenter(p.center)}</span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`ลบ ${p.name} ออกจากเครื่องนี้`}
                    title="ลบออกจากเครื่องนี้"
                    onClick={() => {
                      if (window.confirm(`ลบ ${p.name} และความก้าวหน้าที่บันทึกบนเครื่องนี้? (ข้อมูลที่ส่งเข้าระบบแล้วจะยังอยู่)`)) profileStore.remove(p.id);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <a className="small" href="#/report">
          สำหรับครู: ดูรายงานสถิติผู้เรียน
        </a>
      </section>
    </main>
  );
}
