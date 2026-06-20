const fs = require('fs');
const path = require('path');

const root = process.cwd();
const metadataPath = path.join(root, 'metadata', 'rights-metadata.json');
const reportDir = path.join(root, 'reports');
const jsonReportPath = path.join(reportDir, 'rights-check-report.json');
const markdownReportPath = path.join(reportDir, 'rights-check-report.md');

const requiredFields = [
  'id',
  'title',
  'type',
  'sourceType',
  'createdBy',
  'license',
  'usesRealPerson',
  'usesOfficialLogo',
  'usesOfficialScreenshot',
  'usesExistingCharacter',
  'usesGroupNameOrTourName',
  'inspiredByOfficialMerch',
  'allowsColorChange',
  'sampleUsesFictionalContent',
  'notes'
];

const highBooleanFields = [
  ['usesRealPerson', 'real person / celebrity photo risk'],
  ['usesOfficialLogo', 'official logo risk'],
  ['usesOfficialScreenshot', 'official screenshot / video capture risk'],
  ['usesExistingCharacter', 'existing character risk'],
  ['usesGroupNameOrTourName', 'real group / tour / official name risk'],
  ['inspiredByOfficialMerch', 'official merch reproduction risk']
];

const highKeywords = [
  '公式グッズ風',
  '公式っぽい',
  '本物みたい',
  'あのグッズ風',
  '嵐風',
  'Snow Man風',
  'なにわ男子風',
  'ARASHI',
  'ジャニーズ',
  'STARTO',
  'サンリオ',
  'ディズニー',
  '公式写真',
  '配信スクショ',
  'ライブ映像',
  'MVスクショ',
  '雑誌画像',
  '著名人画像',
  '実在アイドル',
  '公式ロゴ'
];

const mediumKeywords = [
  'グッズ風',
  'チケット風',
  'トレカ風',
  '会報風',
  'バーコード',
  '物販風',
  'パッケージ風',
  'メンカラ',
  '5色',
  '推しカラー'
];

const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const riskRank = { low: 0, medium: 1, high: 2 };

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return fullPath;
  });
}

function toPosix(filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function bumpRisk(current, next) {
  return riskRank[next] > riskRank[current] ? next : current;
}

function loadMetadata() {
  if (!fs.existsSync(metadataPath)) {
    return { items: [], fileMissing: true };
  }
  const parsed = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  return { items: Array.isArray(parsed.items) ? parsed.items : [], fileMissing: false };
}

function readTextFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function removeRightsNotice(html) {
  return html.replace(/<section[^>]*class="[^"]*rights-notice[^"]*"[\s\S]*?<\/section>/gi, '');
}

function referencedImageFiles() {
  const html = removeRightsNotice(readTextFile('index.html'));
  const matches = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi)];
  return matches
    .map(match => match[1].split('?')[0].replace(/^\.\//, ''))
    .filter(src => src.startsWith('assets/') || src.startsWith('public/'));
}

function isContextuallyCleared(keyword, item) {
  const notes = String(item.notes || '');
  const originalSource = ['original', 'owned', 'ai-generated', 'authorized'].includes(item.sourceType);
  const noHighFlags = highBooleanFields.every(([field]) => item[field] === false);
  const hasClarifyingNote = [
    '特定の公式グッズ再現ではない',
    '特定グループ専用ではない',
    '一般的なジャンル表現',
    '架空',
    'オリジナル'
  ].some(text => notes.includes(text));
  if (keyword === '5色' && item.allowsColorChange && hasClarifyingNote) return true;
  return originalSource && noHighFlags && hasClarifyingNote;
}

function keywordFindings(text, item) {
  const findings = [];
  highKeywords.forEach(keyword => {
    if (text.includes(keyword)) findings.push({ risk: 'high', reason: `high-risk wording detected: ${keyword}` });
  });
  mediumKeywords.forEach(keyword => {
    if (!text.includes(keyword)) return;
    if (item && isContextuallyCleared(keyword, item)) {
      findings.push({ risk: 'low', reason: `reviewed medium signal: ${keyword}` });
    } else {
      findings.push({ risk: 'medium', reason: `review-needed wording detected: ${keyword}` });
    }
  });
  return findings;
}

function resultForFile(file, item) {
  let risk = 'low';
  const reasons = [];
  const suggestions = [];

  if (!item) {
    return {
      file,
      hasMetadata: false,
      risk: 'high',
      canPublish: false,
      requiresHumanReview: true,
      reasons: ['missing required rights metadata'],
      recommendation: '公開前に metadata/rights-metadata.json へ権利メタデータを追加してください。'
    };
  }

  const missingFields = requiredFields.filter(field => !(field in item));
  if (missingFields.length) {
    risk = 'high';
    reasons.push(`missing metadata fields: ${missingFields.join(', ')}`);
    suggestions.push('必須メタデータをすべて入力してください。');
  }

  highBooleanFields.forEach(([field, reason]) => {
    if (item[field] === true) {
      risk = bumpRisk(risk, 'high');
      reasons.push(reason);
    }
  });

  if (['unknown', 'external', 'pinterest', 'google-image-search', 'instagram', 'x', 'sns'].includes(item.sourceType)) {
    risk = bumpRisk(risk, 'medium');
    reasons.push(`unclear or external source type: ${item.sourceType}`);
  }

  if (['official', 'unlicensed', 'unknown'].includes(item.license)) {
    risk = bumpRisk(risk, item.license === 'official' || item.license === 'unlicensed' ? 'high' : 'medium');
    reasons.push(`license needs review: ${item.license}`);
  }

  if (item.sampleUsesFictionalContent === false) {
    risk = bumpRisk(risk, 'medium');
    reasons.push('sample content is not marked as fictional');
  }

  const searchText = [
    file,
    item.id,
    item.title,
    item.type,
    item.sourceType,
    item.createdBy,
    item.license,
    item.alt,
    item.description,
    item.notes
  ].filter(Boolean).join('\n');

  keywordFindings(searchText, item).forEach(finding => {
    risk = bumpRisk(risk, finding.risk);
    reasons.push(finding.reason);
  });

  if (risk === 'low') {
    reasons.push('metadata present');
    reasons.push('no high-risk flags');
    if (item.sourceType === 'original' || item.sourceType === 'owned') reasons.push('original / owned source');
    if (item.sourceType === 'ai-generated') reasons.push('ai-generated without real names or existing works');
    if (item.allowsColorChange) reasons.push('color customizable');
    suggestions.push('publish ok');
  }

  if (risk === 'medium') {
    suggestions.push('人間レビュー後、公式素材・実在人物・既存キャラクター・公式グッズ再現ではないことを notes に明記してください。');
  }

  if (risk === 'high') {
    suggestions.push('公開禁止。publicに入れず、assets/quarantine または assets/rejected に移動し、架空・自作・許可素材へ差し替えてください。');
  }

  return {
    file,
    hasMetadata: true,
    risk,
    canPublish: risk === 'low',
    requiresHumanReview: risk !== 'low',
    reasons,
    recommendation: suggestions.join(' ')
  };
}

function resultForTextContent(file, text) {
  let risk = 'low';
  const reasons = [];
  keywordFindings(text, null).forEach(finding => {
    risk = bumpRisk(risk, finding.risk);
    reasons.push(finding.reason);
  });
  return {
    file,
    hasMetadata: true,
    risk,
    canPublish: risk === 'low',
    requiresHumanReview: risk !== 'low',
    reasons: reasons.length ? reasons : ['no risky wording detected in public page text'],
    recommendation: risk === 'low'
      ? 'publish ok'
      : '公開ページ上の文言を、公式再現・実在名・既存キャラクター連想のない表現へ修正してください。'
  };
}

function makeMarkdown(results) {
  const lines = [
    '# 権利リスクチェック レポート',
    '',
    `生成日時: ${new Date().toISOString()}`,
    '',
    '| file | metadata | risk | canPublish | humanReview | reasons | recommendation |',
    '| --- | --- | --- | --- | --- | --- | --- |'
  ];

  results.forEach(result => {
    lines.push([
      result.file,
      result.hasMetadata ? 'yes' : 'no',
      result.risk,
      result.canPublish ? 'yes' : 'no',
      result.requiresHumanReview ? 'yes' : 'no',
      result.reasons.join('<br>'),
      result.recommendation
    ].map(value => String(value).replace(/\|/g, '\\|')).join(' | '));
  });

  return `${lines.join('\n')}\n`;
}

function main() {
  const { items, fileMissing } = loadMetadata();
  const metadataByFile = new Map(items.map(item => [item.file, item]));
  const files = [
    ...walk(path.join(root, 'assets')),
    ...walk(path.join(root, 'public'))
  ]
    .filter(file => imageExtensions.has(path.extname(file).toLowerCase()))
    .map(toPosix)
    .sort();

  const referenced = referencedImageFiles();
  const allTargetFiles = Array.from(new Set([...files, ...referenced])).sort();

  const results = [];
  if (fileMissing) {
    results.push({
      file: 'metadata/rights-metadata.json',
      hasMetadata: false,
      risk: 'high',
      canPublish: false,
      requiresHumanReview: true,
      reasons: ['rights metadata file is missing'],
      recommendation: 'metadata/rights-metadata.json を作成してください。'
    });
  }

  allTargetFiles.forEach(file => {
    results.push(resultForFile(file, metadataByFile.get(file)));
  });

  items
    .filter(item => item.file && !allTargetFiles.includes(item.file))
    .forEach(item => {
      results.push({
        file: item.file,
        hasMetadata: true,
        risk: 'medium',
        canPublish: false,
        requiresHumanReview: true,
        reasons: ['metadata exists but target file was not found'],
        recommendation: '不要なメタデータを削除するか、対象ファイルを確認してください。'
      });
    });

  results.push(resultForTextContent('index.html public text', removeRightsNotice(readTextFile('index.html'))));

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(jsonReportPath, `${JSON.stringify(results, null, 2)}\n`);
  fs.writeFileSync(markdownReportPath, makeMarkdown(results));

  const highCount = results.filter(result => result.risk === 'high').length;
  const mediumCount = results.filter(result => result.risk === 'medium').length;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.BUILD_ENV === 'production' || process.env.CI_PRODUCTION === 'true';
  const allowMedium = process.env.ALLOW_MEDIUM_RISK === 'true' && !isProduction;

  console.log(`rights check: ${results.length} checked, high=${highCount}, medium=${mediumCount}`);
  console.log(`reports: ${path.relative(root, jsonReportPath)}, ${path.relative(root, markdownReportPath)}`);

  if (highCount > 0) {
    console.error('rights check failed: high risk item exists.');
    process.exit(1);
  }

  if (mediumCount > 0 && !allowMedium) {
    console.error('rights check failed: medium risk item requires human review. Set ALLOW_MEDIUM_RISK=true only for non-production review runs.');
    process.exit(1);
  }
}

main();
