FROM node:18-alpine

# Создаем рабочую папку в контейнере
WORKDIR /app

# Копируем файлы с зависимостями
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь проект
COPY . .

# Собираем приложение
RUN npm run build

# Открываем порт 3000
EXPOSE 3000

# Команда для запуска приложения
CMD ["node", "dist/main.js"]
