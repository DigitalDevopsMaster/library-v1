#!/bin/bash

# Crear un archivo temporal para la clave privada



echo "DROPLET_IP: ${secrets.DROPLET_IP}"
echo "DROPLET_USERNAME: ${secrets.DROPLET_USERNAME}"
echo "SSH_PRIVATE_KEY: ${secrets.SSH_PRIVATE_KEY}"


echo -e "${secrets.SSH_PRIVATE_KEY}" > ssh_key.pem
chmod 600 ssh_key.pem

# Copiar el archivo v1.js al Droplet
scp -i ssh_key.pem v1.js ${secrets.DROPLET_USERNAME}@${secrets.DROPLET_IP}:/library/v1

# Eliminar el archivo temporal de la clave privada
rm -f ssh_key.pem




