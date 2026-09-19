/**
 * npm run test:tools — dò phần cứng cho model local.
 *
 * Repo này chạy trên Windows, macOS và Linux, nhưng máy nào cũng chỉ là một trong số đó. Các tổ hợp
 * còn lại chỉ kiểm được ở đây: `deviceFrom` là hàm thuần, nhận đúng thứ hệ điều hành trả về.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { batchSizeFor, castLocal, deviceFrom, FILE_PENDING, looksLikeFile, refFailCache, refFromFile, refStatus, torchArgs } from './omnivoice.mjs';

const NVIDIA_3060 = 'NVIDIA GeForce RTX 3060 Laptop GPU, 6144';
const NVIDIA_4090 = 'NVIDIA GeForce RTX 4090, 24564';

test('Mac Apple Silicon dùng MPS', () => {
  const d = deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 32 });
  assert.equal(d.id, 'mps');
  assert.equal(d.tight, false, '32 GB bộ nhớ hợp nhất là thoải mái');
});

test('Mac Apple Silicon 8 GB vẫn là máy chật', () => {
  // Bộ nhớ hợp nhất: model chiếm luôn phần RAM mà hệ điều hành đang dùng.
  assert.equal(deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 8 }).tight, true);
});

test('Mac Intel KHÔNG được nhận là MPS', () => {
  // Lỗi thật đã mắc: bắt mọi máy darwin là Apple Silicon thì Mac Intel cài nhầm bản torch.
  const d = deviceFrom({ platform: 'darwin', arch: 'x64', totalMemGb: 16 });
  assert.equal(d.id, 'cpu');
  assert.match(d.label, /Intel/);
});

test('Linux có card NVIDIA thì dùng CUDA', () => {
  const d = deviceFrom({ platform: 'linux', arch: 'x64', nvidia: NVIDIA_4090 });
  assert.equal(d.id, 'cuda');
  assert.equal(d.vramGb, 24);
  assert.equal(d.tight, false);
});

test('Linux không có GPU thì về CPU, và luôn bị coi là chật', () => {
  const d = deviceFrom({ platform: 'linux', arch: 'x64', nvidia: '' });
  assert.equal(d.id, 'cpu');
  assert.equal(d.tight, true);
});

test('Windows có card yếu thì vẫn dùng CUDA nhưng báo chật', () => {
  const d = deviceFrom({ platform: 'win32', arch: 'x64', nvidia: NVIDIA_3060 });
  assert.equal(d.id, 'cuda');
  assert.equal(d.vramGb, 6);
  assert.equal(d.tight, true, 'dưới 8 GB VRAM phải cảnh báo');
});

test('tên card không bị lặp chữ NVIDIA', () => {
  assert.match(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: NVIDIA_3060 }).label, /^NVIDIA GeForce/);
  assert.doesNotMatch(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: NVIDIA_3060 }).label, /NVIDIA NVIDIA/);
  // Card không mang sẵn chữ NVIDIA thì mới ghép thêm vào.
  assert.match(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: 'Tesla T4, 15360' }).label, /^NVIDIA Tesla T4/);
});

test('nvidia-smi trả về rác thì không được nhận là có GPU', () => {
  for (const junk of ['', '   ', '\n']) {
    assert.equal(deviceFrom({ platform: 'linux', arch: 'x64', nvidia: junk }).id, 'cpu');
  }
});

test('chỉ CUDA mới cài torch bản cu128', () => {
  assert.ok(torchArgs('cuda').some((a) => a.includes('cu128')));
  for (const device of ['mps', 'cpu']) {
    assert.ok(!torchArgs(device).some((a) => a.includes('cu128')), `${device} không được cài bản CUDA`);
    assert.ok(!torchArgs(device).includes('--extra-index-url'), `${device} dùng PyPI thường`);
  }
});

// Đây là bug đã đo được: card 6 GB, để nó tự gom batch thì cả 39 câu vào một lượt, VRAM 97 %,
// hơn 30 phút không ra nổi một file. Chia nhỏ là thứ duy nhất cứu được.
test('card chật thì chia batch nhỏ, card rộng mới gom nhiều', () => {
  const card = (vramGb, tight) => ({ id: 'cuda', label: '', vramGb, tight });
  assert.equal(batchSizeFor(card(6, true)), 2);
  assert.equal(batchSizeFor(card(8, false)), 4);
  assert.equal(batchSizeFor(card(12, false)), 8);
  assert.equal(batchSizeFor(card(24, false)), 16);
});

test('không GPU hoặc không đo được VRAM thì chọn mức an toàn nhất', () => {
  assert.equal(batchSizeFor({ id: 'cpu', vramGb: null, tight: true }), 1);
  assert.equal(batchSizeFor({ id: 'cuda', vramGb: null, tight: false }), 4);
  assert.equal(batchSizeFor(null), 1);
});

test('Mac Apple Silicon đi theo đúng ngưỡng chật/rộng của bộ nhớ hợp nhất', () => {
  assert.equal(batchSizeFor(deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 8 })), 2);
  assert.equal(batchSizeFor(deviceFrom({ platform: 'darwin', arch: 'arm64', totalMemGb: 32 })), 16);
});

// ── phân vai: hai nhân vật, hai giọng ────────────────────────────────────────
// Các test dưới đây đọc voices.json thật của repo, vì đó chính là thứ quyết định ai mượn giọng ai —
// một bản giả sẽ kiểm đúng cái nó tự bịa ra.

const HOI_THOAI = [
  { n: 1, text: 'Chào các bạn.', speaker: 'Tú' },
  { n: 2, text: 'Bắt đầu từ đâu?', speaker: 'Lucas', delivery: 'hoi' },
  { n: 3, silent: 2 },
  { n: 4, text: 'Từ vòng lặp.', speaker: 'Tú' },
];

test('mỗi nhân vật mượn đúng giọng voices.json đã gán, không phải giọng mặc định của video', () => {
  const cast = castLocal(HOI_THOAI);
  assert.equal(cast.dialogue, true);
  assert.equal(cast.roles.length, 2, 'Tú nói hai câu nhưng vẫn là một vai');
  const [tu, lucas] = cast.roles;
  assert.equal(tu.voiceName, 'Nhật Phong');
  assert.equal(lucas.voiceName, 'Đô Trịnh');
  assert.notEqual(tu.voiceId, lucas.voiceId, 'hai nhân vật phải ra hai giọng khác nhau');
  assert.deepEqual(tu.cues, [1, 4]);
  assert.ok(cast.ok);
});

test('bí danh trong kịch bản trỏ về đúng nhân vật, kèm mặt và phía của nhân vật đó', () => {
  // Day 04 gọi Tới là "Lucas" — thẻ hội thoại phải mang mặt của Tới, không phải một vai mới.
  const lucas = castLocal(HOI_THOAI).roles[1];
  assert.equal(lucas.character, 'toi');
  assert.equal(lucas.name, 'Lucas', 'tên hiện lên là tên kịch bản gọi');
  assert.ok(lucas.avatar, 'phải có avatar để thẻ hội thoại vẽ được');
});

test('câu khoảng lặng không sinh audio, và kiểu đọc đổi tốc độ của riêng câu đó', () => {
  const cast = castLocal(HOI_THOAI);
  assert.deepEqual(cast.rows.map((r) => r.n), [1, 2, 4]);
  assert.equal(cast.rows.find((r) => r.n === 2).speed, 0.9, 'delivery "hỏi" chậm lại');
  assert.equal(cast.rows.find((r) => r.n === 1).speed, 1, 'câu không khai delivery giữ nguyên nhịp');
});

test('đổi giọng cho riêng một vai, các vai khác giữ nguyên', () => {
  // Gọi vai bằng tên kịch bản, bằng id nhân vật hay bằng tên nhân vật đều phải trúng.
  for (const key of ['Lucas', 'toi', 'Tới']) {
    const cast = castLocal(HOI_THOAI, { speakers: { [key]: 'Cẩm Hồng' } });
    assert.equal(cast.roles[1].voiceName, 'Cẩm Hồng', `khai bằng "${key}"`);
    assert.equal(cast.roles[1].picked, true);
    assert.equal(cast.roles[0].voiceName, 'Nhật Phong', 'vai còn lại không bị đụng tới');
  }
});

test('một đường dẫn file được hiểu là mẫu giọng, một cái tên thì không', () => {
  assert.ok(looksLikeFile('D:/giong/mau.wav'));
  assert.ok(looksLikeFile('mau.mp3'));
  assert.ok(!looksLikeFile('Nhật Phong'), 'tên giọng không có gạch chéo và không có đuôi audio');
  const cast = castLocal(HOI_THOAI, { speakers: { 'Tú': 'D:/giong/tu.wav' } });
  assert.equal(cast.roles[0].source, 'file');
  assert.equal(cast.roles[1].source, 'catalog', 'vai kia vẫn lấy mẫu từ kho media');
});

test('chọn "giọng từ file" mà chưa chọn file thì là lỗi chặn sinh, không lặng lẽ rơi về giọng vừa bỏ', () => {
  // Panel từng để lọt: Tú chọn Cẩm Hồng rồi đổi sang "giọng từ file", bỏ trống ô — lượt sinh vẫn đọc bằng Cẩm Hồng.
  const cast = castLocal(HOI_THOAI, { speakers: { 'Tú': FILE_PENDING } });
  const tu = cast.roles[0];
  assert.equal(tu.source, 'file');
  assert.equal(tu.picked, true);
  assert.equal(tu.voiceId, null, 'không được mang giọng nào của danh mục');
  assert.match(tu.error, /chưa chọn file/);
  assert.equal(cast.ok, false, 'phải chặn lượt sinh');
  assert.ok(cast.problems.some((p) => p.includes('Tú') && /chưa chọn file/.test(p)), 'lỗi phải gọi đúng tên vai');
  assert.equal(cast.roles[1].error, null, 'vai còn lại không bị vạ lây');
});

test('mẫu đã nghe thất bại được nhớ lại: dàn vai báo ngay, không khen "lần đầu sẽ nghe" và không nghe lần nữa', async () => {
  // Đã thấy thật: một MP3 không có tiếng nói làm lượt sinh chết, mà thẻ nhân vật vẫn xanh "lần đầu sẽ nghe
  // lời của mẫu bằng Whisper" — vì bước kiểm dàn vai không biết lần nghe trước đã hỏng.
  const [fs, os, path] = await Promise.all([import('node:fs'), import('node:os'), import('node:path')]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-fail-'));
  const file = path.join(dir, 'khong-co-loi.wav');
  fs.writeFileSync(file, 'không phải wav thật, chỉ cần nội dung để băm');
  const failCache = refFailCache(file);
  fs.mkdirSync(path.dirname(failCache), { recursive: true });
  const hadCache = fs.existsSync(failCache);
  fs.writeFileSync(failCache, 'mẫu giọng không có tiếng nói — Whisper không nghe ra lời nào.\n');
  try {
    const role = { source: 'file', file, error: null };
    const status = refStatus(role);
    assert.equal(status.ready, false);
    assert.match(status.note, /không có tiếng nói/);
    const again = await refFromFile(file);
    assert.match(again.error, /không có tiếng nói/, 'trả lại đúng câu đã nhớ, không chạy Whisper');
    // Người dùng đặt .txt cùng tên cạnh file thì lời người ghi thắng cache hỏng.
    fs.writeFileSync(path.join(dir, 'khong-co-loi.txt'), 'Lời của đoạn mẫu.');
    assert.equal(refStatus(role).ready, true, 'có .txt cùng tên là sẵn sàng');
    assert.equal((await refFromFile(file)).from, 'sidecar');
  } finally {
    if (!hadCache) fs.rmSync(failCache, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('tên nhân vật lạ dừng lượt sinh, thay vì lặng lẽ đọc bằng người khác', () => {
  const cast = castLocal([{ n: 1, text: 'Xin chào.', speaker: 'Bảo' }]);
  assert.equal(cast.ok, false);
  assert.match(cast.problems[0], /Bảo/);
});

test('giọng không có trong danh mục cũng bị chặn: model local cần một mẫu để nhân bản', () => {
  const cast = castLocal(HOI_THOAI, { speakers: { 'Tú': 'Giọng Không Tồn Tại' } });
  assert.equal(cast.ok, false);
  assert.match(cast.roles[0].error, /không có giọng/);
});

test('video một người dẫn vẫn chạy như cũ: không nhân vật, giọng lấy từ --voice', () => {
  const cast = castLocal([{ n: 1, text: 'Xin chào.' }], { voice: 'Viên' });
  assert.equal(cast.dialogue, false);
  assert.equal(cast.roles.length, 1);
  assert.equal(cast.roles[0].speaker, null);
  assert.equal(cast.roles[0].voiceName, 'Viên');
});
