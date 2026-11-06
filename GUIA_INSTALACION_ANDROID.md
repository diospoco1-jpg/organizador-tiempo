# Guía para instalar Organizador de Tiempo en Android

La aplicación se entrega como PWA (aplicación web instalable). Al instalarla desde Chrome, aparece con su icono y se abre en una ventana independiente. No es un APK de Play Store.

## 1. Publicar la aplicación gratis con GitHub Pages

Necesitas una cuenta de GitHub y acceso a una computadora para subir la carpeta descomprimida con facilidad.

1. Descarga `Organizador_de_Tiempo_Android.zip` y extrae su contenido.
2. Entra a https://github.com y crea una cuenta o inicia sesión.
3. Crea un repositorio nuevo llamado `organizador-tiempo`. Para publicar con GitHub Free, el repositorio debe ser público.
4. Dentro del repositorio, pulsa **Add file → Upload files**.
5. Sube los archivos y la carpeta `icons` que están dentro de `organizador-tiempo-app` (no subas solamente el ZIP). Debes ver `index.html` en la raíz del repositorio.
6. Pulsa **Commit changes**.
7. En el repositorio abre **Settings → Pages**.
8. En **Build and deployment**, elige **Deploy from a branch**.
9. En Branch selecciona **main** y carpeta **/(root)**; pulsa **Save**.
10. Espera a que GitHub Pages publique el sitio. En esa misma sección aparecerá una dirección que termina en `github.io/organizador-tiempo/`.

Importante: GitHub Pages publica el contenido del repositorio en internet. No subas tareas personales, respaldos JSON ni datos privados. Solo publica los archivos de la aplicación.

## 2. Instalar en el teléfono Android

1. Abre la dirección `github.io` que te dio GitHub Pages en **Google Chrome** en el teléfono.
2. Espera a que cargue Organizador de Tiempo.
3. Pulsa el menú de Chrome (⋮), junto a la barra de direcciones.
4. Elige **Instalar aplicación** o **Añadir a pantalla de inicio** y confirma.
5. Busca el icono **Organiza** en la pantalla de inicio o en el listado de aplicaciones.

En algunos teléfonos o versiones de Chrome el texto del menú puede variar. Si aparece “Añadir a pantalla de inicio”, selecciónalo y confirma.

## 3. Uso sin conexión y respaldo

- Abre la aplicación una vez con internet para que se guarden sus archivos; después podrá abrirse sin conexión en ese dispositivo.
- Las tareas se guardan localmente en el navegador del teléfono. No borres los datos de Chrome si no has descargado antes un respaldo.
- Para guardar una copia, entra en **Ajustes → Descargar respaldo**. Se descargará un archivo JSON.
- Para recuperar esa copia, abre **Ajustes → Importar respaldo** y selecciona el archivo.

## 4. Si no aparece “Instalar aplicación”

Comprueba que abriste la dirección publicada (HTTPS) y no un archivo `index.html` descargado. Recarga la página en Chrome. También puedes usar el menú ⋮ → **Añadir a pantalla de inicio**.

## Ayuda oficial

- Ayuda de Chrome para instalar aplicaciones web en Android: https://support.google.com/chrome/answer/9658361?hl=es
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
