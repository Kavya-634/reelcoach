import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  FileVideo,
  Hash,
  ImagePlus,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from 'lucide-react';
import { CopyButton, DemoNote, PageHeading } from '../components/Shared';
import { createCaptions, isDraftLink } from '../lib/captions';
import type { CaptionResult, Tone } from '../lib/captions';
import metaRules from '../knowledge/metaRules.json';

export function CaptionStudio() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [link, setLink] = useState('');
  const [topic, setTopic] = useState(params.get('topic') ?? 'Slow mornings & everyday rituals');
  const [tone, setTone] = useState<Tone>('Warm & relatable');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<CaptionResult | null>(null);
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const output = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => () => clearTimeout(timeout.current), []);
  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    if (
      ![
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/webm',
      ].includes(candidate.type)
    ) {
      setError('Try a JPG, PNG, WebP, MP4, MOV, or WebM file.');
      return;
    }
    if (candidate.size > 100 * 1024 * 1024) {
      setError('That file is a little large. Please choose one smaller than 100 MB.');
      return;
    }
    setFile(candidate);
    setError('');
  };
  const generate = (useSample = false) => {
    setError('');
    if (!topic.trim()) {
      setError('Give your idea a little context first. What’s the reel about?');
      return;
    }
    if (!useSample && mode === 'link' && !isDraftLink(link)) {
      setError('Please paste a complete http:// or https:// draft link, or try the sample.');
      return;
    }
    if (!useSample && mode === 'upload' && !file) {
      setError('Choose a file, or use “Try with sample content” to explore the studio.');
      return;
    }
    setGenerating(true);
    timeout.current = setTimeout(() => {
      setResult(createCaptions(topic, tone));
      setSelected(0);
      setGenerating(false);
      output.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 500);
  };
  return (
    <div className="page studio-page">
      <PageHeading
        eyebrow="A LITTLE HELP WITH THE WORDS"
        title="Your ideas. A little more articulate."
        description="Find a starting point for your next caption—then make it your own."
      >
        <span className="studio-status">
          <span className="status-dot" />
          Local demo studio
        </span>
      </PageHeading>
      <DemoNote>
        No AI calls or uploads. Files stay in your browser; links are not fetched. Suggestions use
        your topic and local templates only.
      </DemoNote>
      <div className="studio-layout">
        <section className="panel studio-input">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">01 / THE INSPIRATION</span>
              <h2>What are we creating?</h2>
              <p>Bring the moment. We’ll help with a first draft.</p>
            </div>
            <span className="section-icon">
              <ImagePlus size={19} />
            </span>
          </div>
          <div className="studio-source-tabs">
            <button
              className={mode === 'upload' ? 'selected' : ''}
              onClick={() => {
                setMode('upload');
                setError('');
              }}
            >
              <UploadCloud size={15} />
              Upload content
            </button>
            <button
              className={mode === 'link' ? 'selected' : ''}
              onClick={() => {
                setMode('link');
                setError('');
              }}
            >
              <Link2 size={15} />
              Paste a draft link
            </button>
          </div>
          {mode === 'upload' ? (
            <>
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                className="sr-only"
                aria-label="Choose content file"
                onChange={(e) => chooseFile(e.target.files?.[0])}
              />
              <div
                className={`upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  chooseFile(e.dataTransfer.files[0]);
                }}
              >
                {file ? (
                  <div className="file-preview">
                    {file.type.startsWith('image') ? (
                      <img src={preview} alt="Your selected content preview" />
                    ) : (
                      <video
                        src={preview}
                        controls
                        preload="metadata"
                        aria-label="Your selected content preview"
                      />
                    )}
                    <div>
                      <FileVideo size={16} />
                      <span>
                        {file.name}
                        <small>{(file.size / 1024 / 1024).toFixed(1)} MB · Stored locally</small>
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Remove file"
                        onClick={() => {
                          setFile(null);
                          if (input.current) input.current.value = '';
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="upload-trigger" onClick={() => input.current?.click()}>
                    <span className="upload-icon">
                      <UploadCloud size={26} />
                    </span>
                    <strong>Drop your next great idea here</strong>
                    <span>
                      or <u>browse your files</u>
                    </span>
                    <small>JPG, PNG, WebP, MP4, MOV, WebM · Up to 100 MB</small>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="draft-link-input">
              <label htmlFor="draft-link">Your draft link</label>
              <div>
                <Link2 size={16} />
                <input
                  id="draft-link"
                  type="url"
                  placeholder="https://www.instagram.com/reel/..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
              <p>For demo context only. We won’t open the link or retrieve its content.</p>
            </div>
          )}
          <div className="form-field">
            <label htmlFor="topic">
              What’s the story? <span>Give it a little context.</span>
            </label>
            <textarea
              id="topic"
              value={topic}
              maxLength={140}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="A quiet morning, a creative process, a tiny win…"
              rows={3}
            />
            <small>{topic.length}/140</small>
          </div>
          <div className="form-field">
            <label htmlFor="tone">Find your voice</label>
            <div className="tone-select">
              <Sparkles size={16} />
              <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                <option>Warm & relatable</option>
                <option>Playful & punchy</option>
                <option>Thoughtful & calm</option>
              </select>
              <ChevronDown size={15} />
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-primary generate-button"
            disabled={generating}
            onClick={() => generate()}
          >
            {generating ? <LoaderCircle size={17} className="spin" /> : <WandSparkles size={17} />}
            {generating ? 'Finding the words…' : 'Find my caption starters'}
            <ArrowUpRight size={16} />
          </button>
          <button className="sample-button" disabled={generating} onClick={() => generate(true)}>
            Just exploring? Try with sample content <ArrowUpRight size={12} />
          </button>
          <div className="privacy-note">
            <LockKeyhole size={12} />
            Your content never leaves this browser.
          </div>
        </section>
        <div className="studio-output" ref={output}>
          <section className="panel caption-output">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">02 / THE POSSIBILITIES</span>
                <h2>A few ways to say it.</h2>
                <p>A starting point, not the final word.</p>
              </div>
              <span className="section-icon icon-1">
                <TextIcon />
              </span>
            </div>
            {result ? (
              <>
                <div className="caption-tabs">
                  {result.captions.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={i === selected ? 'selected' : ''}
                    >
                      Option 0{i + 1}
                      {i === selected && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <div className="caption-text" aria-live="polite">
                  {result.captions[selected]}
                </div>
                <div className="caption-output-footer">
                  <span>{result.captions[selected].length} characters · Template suggestion</span>
                  <CopyButton text={result.captions[selected]} label="caption" />
                </div>
              </>
            ) : (
              <div className="studio-empty">
                <span className="empty-sparkle">
                  <Sparkles size={34} />
                </span>
                <h3>The right words are in there.</h3>
                <p>
                  Add a little context on the left.
                  <br />
                  Your caption starters will appear here.
                </p>
                <div>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </section>
          <section className="panel keywords-output">
            <div className="output-heading">
              <h3>
                <Sparkles size={16} />
                Keywords to weave in
              </h3>
              {result && <CopyButton text={result.keywords.join(', ')} label="keywords" />}
            </div>
            {result ? (
              <div className="keyword-chips">
                {result.keywords.map((k) => (
                  <span key={k}>{k}</span>
                ))}
              </div>
            ) : (
              <p className="output-placeholder">A few relevant words. Naturally, not everywhere.</p>
            )}
          </section>
          <section className="panel hashtags-output">
            <div className="output-heading">
              <h3>
                <Hash size={16} />A handful of hashtags <span>MAX {metaRules.maxHashtags}</span>
              </h3>
              {result && <CopyButton text={result.hashtags.join(' ')} label="hashtags" />}
            </div>
            {result ? (
              <p className="hashtag-list">{result.hashtags.join(' ')}</p>
            ) : (
              <p className="output-placeholder">
                Specific beats excessive. Your suggestions will land here.
              </p>
            )}
            <div className="hashtag-caveat">
              Demo limit: 5. Verify against Meta’s official announcement before production.
            </div>
          </section>
          <div className="studio-tip">
            <span>✳</span>
            <p>
              <strong>Your voice is the secret ingredient.</strong>Use these as a jumping-off point.
              The little details only you can add? That’s the good stuff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
function TextIcon() {
  return <span className="text-icon">Aa</span>;
}
