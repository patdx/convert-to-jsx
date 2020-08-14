import Head from 'next/head';
import styles from '../styles/index.module.css';
import { compile } from 'handlebars-to-jsx';
import { useState } from 'react';

export default function Home() {
  const [code, setCode] = useState();

  const output = (() => {
    try {
      return compile(code ?? "");
    } catch (err) {
      return String(err);
    }
  })();

  return (
    <>
      <Head>
        <title>Convert Handlebars</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.container}>
        <textarea
          className={styles.left}
          placeholder="Paste handlebars code here and JSX will be output on the right using jsx-to-handlebars"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        ></textarea>
        <textarea
          className={styles.right}
          readOnly
          value={output}
        ></textarea>
      </div>
    </>
  );
}
