import Head from 'next/head';
import styles from '../styles/index.module.css';
import { compile as compileHandlebarsToJsx } from 'handlebars-to-jsx';
import { compileAngularToJsx } from "../lib/angular-to-jsx";
import { useState } from 'react';

export default function Home() {
  const [compiler, setCompiler] = useState("handlebars");
  const [code, setCode] = useState();

  const output = (() => {
    try {
      if (compiler === "handlebars") {
        return compileHandlebarsToJsx(code ?? "");
      } else {
        return compileAngularToJsx(code ?? "");
      }

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
        <div className={styles.left} style={{
          flexDirection: "column",
        }}>
          <select style={{
            display: "block",
            height: `50px`,
            width: "100%"
          }} value={compiler} onChange={event => setCompiler(event.target.value)}>
            <option value="handlebars">Handlebars to JSX</option>
            <option value="angular" >Angular to JSX</option>
          </select>
          <textarea
            style={{
              display: "block",
              height: `calc(100vh - 50px)`,
              width: "100%"
            }}
            placeholder={compiler === "angular" ? `Paste Angular HTML code here and JSX will be output on the right using custom Angular to JSX code` : `Paste Handlebars code here and JSX will be output on the right using jsx-to-handlebars library`}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          ></textarea>
        </div>

        <textarea
          className={styles.right}
          readOnly
          value={output}
        ></textarea>
      </div>
    </>
  );
}
