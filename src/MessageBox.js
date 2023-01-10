import React from "react";
import {
  Header,
  Icon,
  Input,
  Grid,
  Segment,
  Card,
  Sticky,
  Button,
  Comment,
} from "semantic-ui-react";
import { formatRelative } from "date-fns";
import avatar from "./avatar.png";
const MessageBox = ({
  messages,
  connectedTo,
  message,
  setMessage,
  sendMsg,
  name,
}) => {
  return (
    <Grid.Column width={11}>
      <Sticky>
        <Card fluid>
          <Card.Content
            header={
              !!connectedTo ? connectedTo : "Not chatting with anyone currently"
            }
          />
          <Card.Content class="messagecontent">
            {!!connectedTo && messages[connectedTo] ? (
              <Comment.Group>
                {messages[connectedTo].map(
                  ({ name: sender, message: text, time }) => (
                    <Comment key={`msg-${name}-${time}`}>
                      <Comment.Avatar src={avatar} />
                      <Comment.Content>
                        <Comment.Author>
                          {sender === name ? "You" : sender}
                        </Comment.Author>
                        <Comment.Metadata>
                          <span>
                            {formatRelative(new Date(time), new Date())}
                          </span>
                        </Comment.Metadata>
                        <Comment.Text>{text}</Comment.Text>
                      </Comment.Content>
                    </Comment>
                  )
                )}
              </Comment.Group>
            ) : (
              <Segment placeholder>
                <Header icon>
                  <Icon name="envelope open outline" />
                  No messages
                </Header>
              </Segment>
            )}
            <Input
              fluid
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type message"
              action
            >
              <input />
              <Button
                inverted
                animated
                color="blue"
                disabled={!message}
                onClick={sendMsg}
              >
                <div class="visible content">
                  <h5>Send</h5>
                </div>
                <div class="hidden content">
                  <i class="chevron circle right icon"></i>
                </div>
              </Button>
            </Input>
          </Card.Content>
        </Card>
      </Sticky>
    </Grid.Column>
  );
};
export default MessageBox;
