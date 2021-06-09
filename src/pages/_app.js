import '../styles/globals.css'
import '../styles/legacy.css'
import '@fortawesome/fontawesome-svg-core/styles.css'

/* eslint-disable react/prop-types */

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp
