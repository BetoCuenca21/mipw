// ==========================================
// 1. Registro del Service Worker
// ==========================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado con éxito:', reg.scope))
      .catch(err => console.error('Error al registrar Service Worker:', err));
  });
}

// ==========================================
// 2. Control de estado Online / Offline
// ==========================================
const statusBadge = document.getElementById('status-badge');

function updateOnlineStatus() {
  if (navigator.onLine) {
    if (statusBadge) {
      statusBadge.textContent = 'En línea';
      statusBadge.className = 'badge online';
    }
  } else {
    if (statusBadge) {
      statusBadge.textContent = 'Sin conexión (Offline)';
      statusBadge.className = 'badge offline';
    }
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Cargar estado inicial al abrir la app
updateOnlineStatus();

// ==========================================
// 3. Manejo del Evento beforeinstallprompt (Instalación)
// ==========================================
let deferredPrompt;
const installBtn = document.getElementById('install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
  // Previene la barra automática por defecto del navegador
  e.preventDefault();
  // Guarda el evento para ejecutarlo después con nuestro botón
  deferredPrompt = e;

  if (installBtn) {
    installBtn.style.display = 'inline-block';

    installBtn.addEventListener('click', () => {
      installBtn.style.display = 'none';
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('El usuario aceptó la instalación de Dulces Los Compas');
        } else {
          console.log('El usuario canceló la instalación');
        }
        deferredPrompt = null;
      });
    });
  }
});

// ==========================================
// 4. Sistema de Notificaciones Locales
// ==========================================
const notifBtn = document.getElementById('notif-btn');

if (notifBtn) {
  notifBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones.');
      return;
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission === 'granted') {
      if (navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification('🍬 ¡Dulces Los Compas!', {
          body: '¡Tienes un 20% de descuento en tu próxima compra de chocolates!',
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png'
        });
      } else {
        new Notification('🍬 ¡Dulces Los Compas!', {
          body: '¡Bienvenido a nuestra tienda de dulces!',
          icon: 'icons/icon-192.png'
        });
      }
    } else {
      alert('Has bloqueado las notificaciones. Puedes habilitarlas en la configuración de tu navegador.');
    }
  });
}

// ==========================================
// 5. Función de Mensaje Flotante (Toast Visual)
// ==========================================
function mostrarToast(mensaje) {
  let toast = document.getElementById('toast');
  
  // Si no existe el div toast en el HTML, lo crea dinámicamente
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = mensaje;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ==========================================
// 6. Fondo / Sincronización en Segundo Plano (Background Sync)
// ==========================================

// Registrar etiqueta de sincronización
async function registrarSincronizacion() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-pedidos');
      console.log('Sincronización en segundo plano registrada.');
    } catch (err) {
      console.error('Error al registrar la sincronización:', err);
    }
  } else {
    console.log('Background Sync no es soportado en este navegador.');
  }
}

// Evento al presionar un botón de guardar pedido o formulario
const btnGuardar = document.getElementById('btn-guardar');
const pedidoInput = document.getElementById('pedido-input');

if (btnGuardar) {
  btnGuardar.addEventListener('click', async () => {
    const texto = pedidoInput ? pedidoInput.value.trim() : '';

    if (!texto) {
      mostrarToast('⚠️ Escribe un pedido antes de guardar.');
      return;
    }

    if (!navigator.onLine) {
      // Guardar localmente
      let pendientes = JSON.parse(localStorage.getItem('pedidos_pendientes') || '[]');
      pendientes.push(texto);
      localStorage.setItem('pedidos_pendientes', JSON.stringify(pendientes));

      // Solicitar Sync
      await registrarSincronizacion();

      mostrarToast('📶 Sin internet: Datos guardados. Se enviarán al volver la red.');
    } else {
      mostrarToast(' Dulce guardado/enviado con éxito.');
    }

    if (pedidoInput) pedidoInput.value = '';
  });
}

// Registrar sincronización automática cuando el navegador detecta que vuelve internet
window.addEventListener('online', () => {
  registrarSincronizacion();
});

// Escuchar respuesta desde el Service Worker cuando se completa la sincronización
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'pedidos-sincronizados') {
      localStorage.removeItem('pedidos_pendientes');
      mostrarToast('🌐 ¡Conexión restablecida! Tus datos guardados se registraron correctamente.');
    }
  });
}