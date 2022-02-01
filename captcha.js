class StatusBar {
  constructor() {
    const statusBar = document.createElement("span")

    statusBar.style = "position: fixed;left: 50%;transform: translateX(-50%);top: 1rem;background-color:  whitesmoke;padding: 1rem;border-radius: 1rem;z-index: 10000;filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.07)) drop-shadow(0 2px 2px rgb(0 0 0 / 0.06));border: 2px solid lightgray;"
    statusBar.id = "auto-captcha-status"

    document.body.appendChild(statusBar)

    this.statusBar = statusBar
  }

  setStatus(message) {
    this.statusBar.innerText = `SimasterAutoCaptcha: ${message}`
  }
}

const listenForModalOpen = (modalId, { onOpen, onClose }) => {
  let wasOpen = false;
  const modalElement = document.getElementById(modalId)

  const interval = setInterval(() => {
    const isOpen = modalElement.classList.contains('in')

    if (wasOpen === false && isOpen === true) {
      if (onOpen) onOpen()
      wasOpen = true
      return
    }

    if (wasOpen === true && isOpen === false) {
      if (onClose) onClose()
      wasOpen = false
      return
    }
  }, 100)
  
  return () => clearInterval(interval)
}

const statusBar = new StatusBar()
statusBar.setStatus("Idle")

async function imageUrlToDataUrl(imageUrl) {
  const blob = await (await fetch(imageUrl)).blob()

  const dataUrl = await new Promise(resolve => {
    let reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  })

  return dataUrl
}

async function solve() {
  statusBar.setStatus("Fetching CAPTCHA")

  const imgElement = document.querySelector(`[src^="https://simaster.ugm.ac.id/sia_krs/input_krs/captcha1"]`)
  const submitButton = document.getElementById("f_captcha").querySelector(".btn-success")

  const dataUrl = await imageUrlToDataUrl(imgElement.src)

  imgElement.src = dataUrl

  const captchaValue = (await Tesseract.recognize(dataUrl, 'eng', { logger: msg => statusBar.setStatus(msg.status) })).data.text

  document.getElementsByName("i_captcha")[0].value = captchaValue

  submitButton.click()
}

const MAX_RETRIES = 10
const CLOSE_MODAL_ON_RETRY_EXHAUSTED = true

listenForModalOpen("modal-default-m", {
  onOpen: async () => {
    let succeeded = false
    let retries = 0

    while (!succeeded && retries < MAX_RETRIES) {
      retries++

      try {
        await solve()
        succeeded = true
        console.log("Success!")
      } catch(err) {
        statusBar.setStatus(`Retrying... (${retries}/${MAX_RETRIES})`)
        await new Promise((resolve) => setTimeout(resolve, 500))
        console.warn("An error occured. Retrying...", err)
      }
    }

    if (succeeded) {
      statusBar.setStatus("Success!")
    } else {
      statusBar.setStatus("Failed. Retries exhausted.")

      if (CLOSE_MODAL_ON_RETRY_EXHAUSTED) {
        const cancelButton = document.getElementById("f_captcha").querySelector(".btn-warning")

        cancelButton.click()
      }
    }

    setTimeout(() => {
      statusBar.setStatus("Idle")
    }, 1000)
  }
})
