<script setup>
// The house bug button (see utils/bugreport.js for where reports go). A
// small round button pinned to the bottom-right corner, under the RSVP
// modal's backdrop so it never sits on top of the form.
import { inject, ref } from 'vue'
import { sendReport, flushStash } from '@/utils/bugreport.js'

const snapshot = inject('bugSnapshot', () => ({}))

const open = ref(false)
const text = ref('')
const sending = ref(false)
const error = ref('')
const sentMessage = ref('')

flushStash()

const close = () => {
  if (!sending.value) {
    open.value = false
    error.value = ''
  }
}

const send = async () => {
  const transcript = text.value.trim()
  if (!transcript || sending.value) return
  sending.value = true
  error.value = ''
  try {
    const outcome = await sendReport(transcript, snapshot())
    sentMessage.value =
      outcome === 'sent' ? 'Sent — thanks!' : 'Saved — it’ll send when you’re back online.'
    text.value = ''
    setTimeout(() => {
      sentMessage.value = ''
      open.value = false
    }, 2200)
  } catch (err) {
    const what = err.message || 'Could not send that report.'
    error.value = err.stashed ? `${what}. Saved — it’ll retry next time you open the site.` : what
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <button class="bug-trigger" title="Report a bug" aria-label="Report a bug" @click="open = true">
    <!-- Bootstrap Icons bug-fill, inlined (the house glyph). -->
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.978.855a.5.5 0 1 0-.956.29l.41 1.352A5 5 0 0 0 3 6h10a5 5 0 0 0-1.432-3.503l.41-1.352a.5.5 0 1 0-.956-.29l-.291.956A5 5 0 0 0 8 1a5 5 0 0 0-2.731.811l-.29-.956z"/>
      <path d="M13 6v1H8.5v8.975A5 5 0 0 0 13 11h.5a.5.5 0 0 1 .5.5v.5a.5.5 0 1 0 1 0v-.5a1.5 1.5 0 0 0-1.5-1.5H13V9h1.5a.5.5 0 0 0 0-1H13V7h.5A1.5 1.5 0 0 0 15 5.5V5a.5.5 0 0 0-1 0v.5a.5.5 0 0 1-.5.5zm-5.5 9.975V7H3V6h-.5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 0-1 0v.5A1.5 1.5 0 0 0 2.5 7H3v1H1.5a.5.5 0 0 0 0 1H3v1h-.5A1.5 1.5 0 0 0 1 11.5v.5a.5.5 0 1 0 1 0v-.5a.5.5 0 0 1 .5-.5H3a5 5 0 0 0 4.5 4.975"/>
    </svg>
  </button>
  <div v-if="open" class="bug-backdrop" @click.self="close">
    <div class="bug-box" role="dialog" aria-modal="true" aria-label="Report a bug">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0">Report a bug</h4>
        <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
      </div>
      <template v-if="!sentMessage">
        <textarea v-model="text" class="form-control" rows="5" placeholder="What happened?"></textarea>
        <p v-if="error" class="text-danger small mt-2 mb-0">{{ error }}</p>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button type="button" class="btn btn-outline-secondary" @click="close">Cancel</button>
          <button type="button" class="btn btn-primary" :disabled="sending || !text.trim()" @click="send">
            {{ sending ? 'Sending…' : 'Send report' }}
          </button>
        </div>
      </template>
      <p v-else class="bug-sent">{{ sentMessage }}</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bug-trigger {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 1000;
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 50%;
  background: var(--color-parchment);
  border: 1px solid var(--color-tan);
  color: var(--color-walnut);
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  cursor: pointer;

  &:hover { color: var(--color-red); }
}

.bug-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(42, 42, 42, 0.65);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1050;
  padding: 2rem 1rem;
  overflow-y: auto;
}

.bug-box {
  background: var(--color-parchment);
  border-radius: 8px;
  padding: 1.5rem;
  width: 100%;
  max-width: 480px;
  border: 1px solid var(--color-tan);
  margin: auto 0;

  textarea { font-size: 16px; }
}

.bug-sent {
  text-align: center;
  padding: 1rem 0 0;
  font-weight: 600;
  color: var(--color-red);
  margin: 0;
}
</style>
