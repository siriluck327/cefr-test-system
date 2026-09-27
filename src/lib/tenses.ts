export type TenseId =
  | 'present-simple'
  | 'present-continuous'
  | 'present-perfect'
  | 'present-perfect-continuous'
  | 'past-simple'
  | 'past-continuous'
  | 'past-perfect'
  | 'past-perfect-continuous'
  | 'future-simple'
  | 'future-continuous'
  | 'future-perfect'
  | 'future-perfect-continuous';

export interface Tense {
  id: TenseId;
  en: string;
  th: string;
  /** Sentence pattern. */
  form: string;
  use: string;
  /** Typical time words that signal this tense. */
  signals: string;
}

export const TENSES: Tense[] = [
  {
    id: 'present-simple',
    en: 'Present Simple',
    th: 'ปัจจุบันกาลธรรมดา',
    form: 'S + V1 (s/es) · S + do/does not + V1',
    use: 'ความจริง นิสัย กิจวัตรที่ทำเป็นประจำ',
    signals: 'always, usually, often, every day, never',
  },
  {
    id: 'present-continuous',
    en: 'Present Continuous',
    th: 'ปัจจุบันกาลกำลังกระทำ',
    form: 'S + am/is/are + V-ing',
    use: 'สิ่งที่กำลังเกิดขึ้นตอนนี้ หรือช่วงนี้',
    signals: 'now, right now, at the moment, this week',
  },
  {
    id: 'present-perfect',
    en: 'Present Perfect',
    th: 'ปัจจุบันกาลสมบูรณ์',
    form: 'S + have/has + V3',
    use: 'ประสบการณ์ หรือเหตุการณ์ในอดีตที่ยังเกี่ยวข้องกับตอนนี้',
    signals: 'ever, never, already, yet, just, since, for',
  },
  {
    id: 'present-perfect-continuous',
    en: 'Present Perfect Continuous',
    th: 'ปัจจุบันกาลสมบูรณ์กำลังกระทำ',
    form: 'S + have/has been + V-ing',
    use: 'การกระทำที่เริ่มในอดีตและทำต่อเนื่องมาจนถึงตอนนี้',
    signals: 'for, since, all morning, how long',
  },
  {
    id: 'past-simple',
    en: 'Past Simple',
    th: 'อดีตกาลธรรมดา',
    form: 'S + V2 · S + did not + V1',
    use: 'เหตุการณ์ที่เกิดขึ้นและจบไปแล้วในอดีต',
    signals: 'yesterday, last week, ago, in 2010',
  },
  {
    id: 'past-continuous',
    en: 'Past Continuous',
    th: 'อดีตกาลกำลังกระทำ',
    form: 'S + was/were + V-ing',
    use: 'สิ่งที่กำลังเกิดขึ้น ณ ช่วงเวลาหนึ่งในอดีต หรือถูกเหตุการณ์อื่นแทรก',
    signals: 'while, when, at 8 o’clock last night',
  },
  {
    id: 'past-perfect',
    en: 'Past Perfect',
    th: 'อดีตกาลสมบูรณ์',
    form: 'S + had + V3',
    use: 'เหตุการณ์ที่เกิดก่อนอีกเหตุการณ์หนึ่งในอดีต',
    signals: 'before, after, already, by the time',
  },
  {
    id: 'past-perfect-continuous',
    en: 'Past Perfect Continuous',
    th: 'อดีตกาลสมบูรณ์กำลังกระทำ',
    form: 'S + had been + V-ing',
    use: 'การกระทำที่ทำต่อเนื่องมาจนถึงจุดหนึ่งในอดีต',
    signals: 'for, since, before, how long',
  },
  {
    id: 'future-simple',
    en: 'Future Simple',
    th: 'อนาคตกาลธรรมดา',
    form: 'S + will + V1 · S + am/is/are going to + V1',
    use: 'สิ่งที่จะเกิดขึ้น การตัดสินใจ คำสัญญา หรือแผนที่วางไว้',
    signals: 'tomorrow, next week, soon, I think',
  },
  {
    id: 'future-continuous',
    en: 'Future Continuous',
    th: 'อนาคตกาลกำลังกระทำ',
    form: 'S + will be + V-ing',
    use: 'สิ่งที่จะกำลังเกิดขึ้น ณ เวลาหนึ่งในอนาคต',
    signals: 'this time tomorrow, at 8 tonight, all next week',
  },
  {
    id: 'future-perfect',
    en: 'Future Perfect',
    th: 'อนาคตกาลสมบูรณ์',
    form: 'S + will have + V3',
    use: 'สิ่งที่จะเสร็จสมบูรณ์ก่อนเวลาหนึ่งในอนาคต',
    signals: 'by then, by the end of, by the time',
  },
  {
    id: 'future-perfect-continuous',
    en: 'Future Perfect Continuous',
    th: 'อนาคตกาลสมบูรณ์กำลังกระทำ',
    form: 'S + will have been + V-ing',
    use: 'ระยะเวลาที่การกระทำจะดำเนินต่อเนื่องมาจนถึงจุดหนึ่งในอนาคต',
    signals: 'by + เวลา + for + ระยะเวลา',
  },
];

export const TENSE_BY_ID: Map<string, Tense> = new Map(TENSES.map((t) => [t.id, t]));
