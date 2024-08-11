
import requests
import json

def test_proxy_connection():

    # URLs for testing
    http_url = "http://api.ipify.org?format=json"
    https_url = "https://api.ipify.org?format=json"

    # Load proxy configuration from config.json
    print("Loading proxy configuration from config.json...")
    with open('config.json') as config_file:
        config = json.load(config_file)
        proxy = config['proxies']
    print(f"Proxy configuration loaded: {proxy}")

    # Function to make requests and print results
    def make_request(url, use_proxy=False):
        try:
            if use_proxy:
                response = requests.get(url, proxies=proxy, verify=False)
                print(f"Proxy used: {proxy}")
            else:
                response = requests.get(url)
                print("Proxy not used")

            response.raise_for_status()

            print(f"Request URL: {response.url}")
            print(f"Response Headers: {response.headers}")
            print(f"Response Status Code: {response.status_code}")

            ip = response.json().get('ip', 'N/A')
            return ip
        except requests.exceptions.RequestException as e:
            print(f"Error occurred: {str(e)}")
            return None

    # Test HTTP without proxy
    print("\nMaking HTTP request without using the proxy...")
    http_ip_without_proxy = make_request(http_url)
    print(f"HTTP IP without proxy: {http_ip_without_proxy}")

    # Test HTTP with proxy
    print("\nMaking HTTP request using the proxy...")
    http_ip_with_proxy = make_request(http_url, use_proxy=True)
    print(f"HTTP IP with proxy: {http_ip_with_proxy}")

    # Test HTTPS without proxy
    print("\nMaking HTTPS request without using the proxy...")
    https_ip_without_proxy = make_request(https_url)
    print(f"HTTPS IP without proxy: {https_ip_without_proxy}")

    # Test HTTPS with proxy
    print("\nMaking HTTPS request using the proxy...")
    https_ip_with_proxy = make_request(https_url, use_proxy=True)
    print(f"HTTPS IP with proxy: {https_ip_with_proxy}")

    # Verify that the IP addresses are different
    print("\nVerifying that the IP addresses are different...")

    if http_ip_without_proxy == http_ip_with_proxy:
        print("HTTP Proxy connection test failed: IP addresses are the same.")
    else:
        print("HTTP Proxy connection was successfully used.")

    if https_ip_without_proxy == https_ip_with_proxy:
        print("HTTPS Proxy connection test failed: IP addresses are the same.")
    else:
        print("HTTPS Proxy connection was successfully used.")

if __name__ == '__main__':
    test_proxy_connection()

