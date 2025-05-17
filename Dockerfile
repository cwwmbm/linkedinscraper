FROM alpine

RUN apk add python3
RUN apk add py3-pip
RUN apk add git
RUN apk add nano
RUN apk add dcron

RUN git clone https://github.com/Ab4y98/linkedinscraper.git

WORKDIR /linkedinscraper

RUN pip install -r requirements.txt --break-system-packages

RUN mv config_example.json config.json

EXPOSE 5001