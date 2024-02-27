#!/bin/bash

# Crear un archivo temporal para la clave privada
echo -e "${SSH_PRIVATE_KEY}" > ssh_key.pem
chmod 600 ssh_key.pem

# Copiar el archivo v1.js al Droplet
scp -i ssh_key.pem v1.js $DROPLET_USERNAME@$DROPLET_IP:/ruta/de/la/carpeta/remota/library/v1

# Eliminar el archivo temporal de la clave privada
rm -f ssh_key.pem




