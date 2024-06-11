import requests
import json

def test_proxy_connection():

  url = "https://api.ipify.org?format=json"

  # Load proxy configuration from config.json
  with open('config.json') as config_file:
    config = json.load(config_file)
    proxy = config['proxies']

  # Make the first API call without using the proxy
  try:
    response1 = requests.get(url)
    response1.raise_for_status()
    ip1 = response1.json()['ip']
  except requests.exceptions.RequestException as e:
    assert False, f"Proxy connection test failed: Failed to make the first API call without proxy. Reason: {str(e)}"

  # Make the second API call using the proxy
  try:
    response2 = requests.get(url, proxies=proxy)
    response2.raise_for_status()
    ip2 = response2.json()['ip']
  except requests.exceptions.RequestException as e:
    assert False, f"Proxy connection test failed: Failed to make the second API call with proxy. Reason: {str(e)}"

  # Verify that the two IP addresses are different
  assert ip1 != ip2, "Proxy connection test failed: IP addresses are the same"

  # Print the IP addresses for verification
  print(f"Personal IP: {ip1}")
  print(f"Proxy IP: {ip2}")
  print("Proxy connection was successfully used for request.")


if __name__ == '__main__':
  test_proxy_connection()
