import { createContext, useContext, useState, useCallback } from 'react'

const ConfirmContext = createContext(null)

// Fournit une fonction confirm(message) qui retourne une Promise<boolean>,
// utilisable partout dans l'app à la place du confirm() natif du navigateur —
// pour avoir une popup stylée cohérente avec le reste du site.
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null) // { message, resolve }

  const confirmAction = useCallback((message) => {
    return new Promise((resolve) => {
      setRequest({ message, resolve })
    })
  }, [])

  function handleChoice(result) {
    request?.resolve(result)
    setRequest(null)
  }

  return (
    <ConfirmContext.Provider value={confirmAction}>
      {children}
      {request && (
        <div className="modal-overlay" onClick={() => handleChoice(false)}>
          <div className="confirm-leave-card" onClick={(e) => e.stopPropagation()}>
            <h2>Confirmation</h2>
            <p>{request.message}</p>
            <div className="confirm-leave-actions">
              <button className="btn btn-primary" onClick={() => handleChoice(true)}>Confirmer</button>
              <button className="btn btn-ghost" onClick={() => handleChoice(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

// Hook à utiliser dans les composants : const confirmAction = useConfirm()
// puis : const ok = await confirmAction("Es-tu sûr ?")
export function useConfirm() {
  return useContext(ConfirmContext)
}
