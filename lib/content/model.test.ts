import { describe, it, expect } from 'vitest';
import { detectLink, checkUpload, ContentSchema, SnapshotSchema } from './model';

describe('detectLink', () => {
  it('identifies supported posts and strips tracking', () => {
    expect(detectLink('https://www.instagram.com/reel/DAbc123xyz/?igsh=abc')).toMatchObject({ ok: true, platform: 'instagram', format: 'reel', url: 'https://www.instagram.com/reel/DAbc123xyz/' });
    expect(detectLink('instagram.com/p/C9xyz')).toMatchObject({ ok: true, format: 'post' });
    expect(detectLink('https://www.tiktok.com/@jordan.lee/video/7301234567890123456?lang=en')).toMatchObject({ ok: true, platform: 'tiktok', url: 'https://www.tiktok.com/@jordan.lee/video/7301234567890123456' });
    expect(detectLink('https://youtube.com/shorts/aBcDeFgHiJk')).toMatchObject({ ok: true, format: 'short' });
    expect(detectLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&si=x')).toMatchObject({ ok: true, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(detectLink('https://youtu.be/dQw4w9WgXcQ')).toMatchObject({ ok: true, platform: 'youtube', format: 'video' });
  });
  it('rejects profiles, other sites and non-web links', () => {
    expect(detectLink('https://www.instagram.com/jordan.lee/').ok).toBe(false);
    expect(detectLink('https://www.youtube.com/@jordan').ok).toBe(false);
    expect(detectLink('https://evil.example/reel/1').ok).toBe(false);
    expect(detectLink('javascript:alert(1)').ok).toBe(false);
  });
});

describe('upload rules', () => {
  it('accepts the beta formats and sizes, and nothing else', () => {
    expect(checkUpload('media', 'video/mp4', 20e6)).toBeNull();
    expect(checkUpload('media', 'video/quicktime', 60e6)).toMatch(/up to 50 MB/);
    expect(checkUpload('media', 'image/gif', 1000)).toMatch(/MP4 or MOV/);
    expect(checkUpload('insight', 'video/mp4', 1000)).toMatch(/PNG, JPEG or WEBP/);
    expect(checkUpload('frame', 'image/png', 1000)).toMatch(/JPEG/);
    expect(checkUpload('media', 'image/png', 0)).toMatch(/empty/);
  });
});

describe('schemas', () => {
  it('normalises the link and checks it matches the platform', () => {
    expect(ContentSchema.parse({ title: 'Glow', platform: 'instagram', url: 'instagram.com/reel/Abc_1-2/?x=1' }).url).toBe('https://instagram.com/reel/Abc_1-2/');
    expect(() => ContentSchema.parse({ title: 'Glow', platform: 'instagram', url: 'https://instagram.com/jordan' })).toThrow(/specific Reel/);
    expect(ContentSchema.parse({ title: 'Blog', platform: 'other', url: 'https://example.com/post' }).url).toBe('https://example.com/post');
  });
  it('needs at least one number, keeps blanks as unknown (not zero), and a note for custom periods', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const s = SnapshotSchema.parse({ contentId: id, measuredOn: '2026-11-07', period: '24h', views: '2599', shares: '', skipRate: '41.8' });
    expect(s).toMatchObject({ views: 2599, shares: null, skipRate: 41.8, comments: null });
    expect(() => SnapshotSchema.parse({ contentId: id, measuredOn: '2026-11-07', period: '24h' })).toThrow(/at least one number/);
    expect(() => SnapshotSchema.parse({ contentId: id, measuredOn: '2026-11-07', period: 'custom', views: 1 })).toThrow(/what period/);
    expect(() => SnapshotSchema.parse({ contentId: id, measuredOn: '2026-11-07', period: '24h', skipRate: 140 })).toThrow(/0–100/);
  });
});

import { sniffMatches } from './model';
import fs from 'node:fs';
import path from 'node:path';
describe('file signatures', () => {
  it('accepts the real sample files and rejects renamed ones', () => {
    const mp4 = fs.readFileSync(path.join(__dirname, '../../tests/e2e/fixtures/sample-reel.mp4')).subarray(0, 32);
    const png = fs.readFileSync(path.join(__dirname, '../../tests/e2e/fixtures/sample-insights.png')).subarray(0, 32);
    expect(sniffMatches('video/mp4', mp4)).toBe(true);
    expect(sniffMatches('image/png', png)).toBe(true);
    expect(sniffMatches('video/mp4', png)).toBe(false);
    expect(sniffMatches('image/jpeg', new TextEncoder().encode('hello, not a jpeg'))).toBe(false);
  });
});
