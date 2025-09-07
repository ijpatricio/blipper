const fs = require('fs')
const path = require('path')

require('dotenv').config()

async function createDroplet() {
    try {
        const cloudInitPath = path.join(__dirname, 'cloud-init.yml')
        const serverConfigPath = path.join(__dirname, 'server-config.json')

        let cloudInitContent = fs.readFileSync(cloudInitPath, 'utf8')
        cloudInitContent = cloudInitContent.replace('{{SSH_PUBLIC_KEY}}', process.env.SSH_PUBLIC_KEY)

        console.log(cloudInitContent)

        const serverConfigContent = fs.readFileSync(serverConfigPath, 'utf8')
        const serverConfig = JSON.parse(serverConfigContent)

        serverConfig.user_data = cloudInitContent

        const response = await fetch('https://api.hetzner.cloud/v1/servers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HETZNER_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serverConfig)
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`HTTP ${response.status}: ${error}`)
        }

        const result = await response.json()
        console.log('Server created successfully:', result)
        return result

    } catch (error) {
        console.error('Error creating server:', error.message)
        process.exit(1)
    }
}

createDroplet()

